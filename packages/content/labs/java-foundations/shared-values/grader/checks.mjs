import { CHECK_THREADS, explainThread, fail, outcomeCases, tasks, threaded, threadWords } from '../../grading.mjs'

const FILE = 'PierWindow.java'
const value = (r, name) => r.values[name]?.value ?? null

// Check holds the lock of the object itself, starts a thread on the learner's call, and waits until
// that thread either finishes or waits for the lock at a line of the learner's. A call that is
// guarded by the object's own lock always waits; one that is not always finishes, since the lock
// is held the whole time. While the thread waits, Check makes a change of its own through the same
// object (the lock is its own, so it may), and lets go. A call that read the value before it took
// the lock then writes back a value without Check's change: a lost update, every time.
const LOCK = `interface CheckWork { void run() throws Throwable; }
final class CheckLock {
    static void rethrow(Throwable x) throws Exception {
        if (x instanceof Error e) throw e;
        if (x instanceof Exception e) throw e;
    }
    static String hold(Object o, CheckWork theirs, CheckWork mine) throws Exception {
        Throwable[] err = new Throwable[1];
        Thread t = new Thread(() -> { try { theirs.run(); } catch (Throwable x) { err[0] = x; } }, "window");
        String how;
        synchronized (o) {
            t.start();
            CheckRun.until(1000, () -> !t.isAlive() || CheckRun.atLock(t));
            how = !t.isAlive() ? "finished" : CheckRun.atLock(t) ? "waited" : "neither";
            if (how.equals("waited")) try { mine.run(); } catch (Throwable x) { rethrow(x); }
        }
        t.join(1000);
        if (err[0] != null) rethrow(err[0]);
        return how;
    }
}
// Runs work on several threads at once, a number of times each, in rounds that a barrier starts
// together, so the threads overlap as much as the computer allows.
final class CheckRounds {
    static void run(int threads, int each, int rounds, CheckWork work) throws Exception {
        Throwable[] err = new Throwable[1];
        for (int round = 0; round < rounds && err[0] == null; round++) {
            java.util.concurrent.CyclicBarrier go = new java.util.concurrent.CyclicBarrier(threads);
            Thread[] ts = new Thread[threads];
            for (int i = 0; i < threads; i++) {
                ts[i] = new Thread(() -> {
                    try { go.await(); for (int k = 0; k < each; k++) work.run(); }
                    catch (Throwable x) { synchronized (err) { if (err[0] == null) err[0] = x; } }
                }, "window");
                ts[i].start();
            }
            for (Thread t : ts) t.join(1500);
        }
        if (err[0] != null) CheckLock.rethrow(err[0]);
    }
}`

// Rounds for numbers: each round a new AtomicInteger, every thread takes numbers at once, and
// Check counts the rounds where a number came out twice or the last number is not the last.
const NUMBERS = `final class CheckNumbers {
    static <N> String rounds(int rounds, int threads, int each, java.util.function.Function<java.util.concurrent.atomic.AtomicInteger, N> make, java.util.function.ToIntFunction<N> next) throws Exception {
        int twice = 0, missing = 0, wrongLast = 0;
        for (int round = 0; round < rounds; round++) {
            int start = 1000 * (round + 1);
            java.util.concurrent.atomic.AtomicInteger last = new java.util.concurrent.atomic.AtomicInteger(start);
            N numbers = make.apply(last);
            java.util.Set<Integer> got = java.util.concurrent.ConcurrentHashMap.newKeySet();
            java.util.concurrent.atomic.AtomicInteger calls = new java.util.concurrent.atomic.AtomicInteger();
            java.util.concurrent.atomic.AtomicBoolean seenTwice = new java.util.concurrent.atomic.AtomicBoolean();
            CheckRounds.run(threads, each, 1, () -> { calls.incrementAndGet(); if (!got.add(next.applyAsInt(numbers))) seenTwice.set(true); });
            if (seenTwice.get()) twice++;
            boolean all = true;
            for (int k = start + 1; k <= start + threads * each; k++) if (!got.contains(k)) { all = false; break; }
            if (!all) missing++;
            if (last.get() != start + threads * each) wrongLast++;
        }
        return twice + " of " + rounds + " rounds gave a number twice, " + missing + " missed a number, " + wrongLast + " left a wrong last number";
    }
}`

// Check's printer notes each fare it prints, and whether the thread printing it held the lock of
// the takings at that moment.
const PRINTER = `final class CheckPrinter implements Printer {
    private final Object takings;
    private final java.util.List<String> printed = new java.util.ArrayList<>();
    volatile boolean inLock;
    CheckPrinter(Object takings) { this.takings = takings; }
    public void print(java.math.BigDecimal fare) {
        if (Thread.holdsLock(takings)) inLock = true;
        synchronized (printed) { printed.add(fare == null ? "null" : fare.toPlainString()); }
    }
    java.util.List<String> printed() { synchronized (printed) { return new java.util.ArrayList<>(printed); } }
}`

const quiet = (d) => (d.output ? { ...d, output: d.output.replace(/\n {2}(?:still waiting|threads left running) is null(?=\n)/g, '') } : d)

function judge(mistakes, { calls }) {
  return (runs, ctx) =>
    outcomeCases({ file: FILE, explain: explainThread })(runs, ctx).map((d, i) => {
      const r = runs[i]
      const stuck = value(r, 'still waiting')
      if (stuck)
        return quiet(fail(d.name, `Check waited for ${calls} to return, and it did not. When Check stopped waiting there was ${threadWords(stuck, FILE)}. Two threads that each wait for a lock the other holds wait for ever.`, d.output))
      if (d.passed) {
        const left = value(r, 'threads left running')
        return left ? quiet(fail(d.name, `The answer is right, and the call left behind ${threadWords(left, FILE)}. In a program of its own, a thread still alive keeps the program from ending.`, d.output)) : quiet(d)
      }
      const m = mistakes.find((k) => k.when(r, ctx))
      return quiet(m ? { ...d, message: typeof m.hint === 'function' ? m.hint(r) : m.hint } : d)
    })
}

const held = (what, owner, owners) => ({
  when: (r) => value(r, 'while Check held the lock') === 'finished',
  hint: `${what} finished while Check held the lock of the ${owner} itself, so nothing in it waits for that lock, and another window can change the value at the same moment. The task guards it with the ${owners} own lock: synchronized, as the task says, and on nothing else.`
})

export const checks = tasks({
  file: FILE,
  objects: true,
  families: true,
  exceptions: true,
  collections: true,
  functions: true,
  values: true,
  tasks: {
    sold: {
      task: 1,
      stub: `${CHECK_THREADS}\n${LOCK}`,
      cases: [
        threaded({
          name: 'add and count keep a count, from one window',
          setup: ['Sold sold = new Sold();'],
          call: 'sold.add(7); sold.add(5)',
          show: 'Sold sold = new Sold();\nsold.add(7);\nsold.add(5);',
          after: { 'count afterwards': 'sold.count()' },
          expected: { 'count afterwards': 12 },
          hint: 'A new Sold counts 0, and each add adds its tickets to the count.'
        }),
        threaded({
          name: 'add waits for the lock of the Sold',
          setup: ['Sold sold = new Sold();'],
          call: 'CheckLock.hold(sold, () -> sold.add(3), () -> sold.add(100))',
          type: 'String',
          show: "Sold sold = new Sold();\n// Check holds the lock of sold, and another thread calls:\nsold.add(3);\n// While it waits, Check adds 100 itself, then lets go.",
          after: { 'while Check held the lock': 'got', 'count afterwards': 'sold.count()' },
          expected: { 'while Check held the lock': 'waited', 'count afterwards': 103 },
          kind: 'add',
          hint: 'add should wait for the lock of the Sold, and add its tickets to the count as it is once it has the lock.'
        }),
        threaded({
          name: 'count waits for the lock of the Sold',
          setup: ['Sold sold = new Sold();'],
          call: 'CheckLock.hold(sold, () -> sold.count(), () -> sold.add(4))',
          type: 'String',
          show: "Sold sold = new Sold();\n// Check holds the lock of sold, and another thread calls:\nsold.count();",
          after: { 'while Check held the lock': 'got' },
          expected: { 'while Check held the lock': 'waited' },
          kind: 'count',
          hint: 'count should wait for the lock of the Sold too.'
        }),
        threaded({
          name: 'four windows adding at once lose no ticket',
          setup: ['Sold sold = new Sold();'],
          call: 'CheckRounds.run(4, 2000, 5, () -> sold.add(1))',
          wait: 2500,
          show: 'Sold sold = new Sold();\n// 4 threads at once, 5 rounds, each thread 2000 times:\nsold.add(1);',
          after: { 'count afterwards': 'sold.count()' },
          expected: { 'count afterwards': 40000 },
          hint: 'Every ticket added counts: with the lock, no add is lost however many threads add at once.'
        })
      ],
      judge: judge(
        [
          { ...held('add', 'Sold', "Sold's"), when: (r) => r.case.kind === 'add' && value(r, 'while Check held the lock') === 'finished' },
          {
            when: (r) => r.case.kind === 'count' && value(r, 'while Check held the lock') === 'finished',
            hint: 'count finished while Check held the lock of the Sold, so it reads the count without the lock. A thread that reads without it may see an old value: the task makes both methods synchronized.'
          },
          {
            when: (r) => r.case.kind === 'add' && value(r, 'while Check held the lock') === 'waited' && Number(value(r, 'count afterwards')) === 3,
            hint: 'add waits for the lock, and still lost the 100 Check added while it waited: it read the count before it had the lock, and wrote back what it had worked out from that old value. Reading, adding and writing all happen while the lock is held.'
          },
          {
            when: (r) => value(r, 'while Check held the lock') === 'neither',
            hint: 'The other thread neither finished nor waited for the lock of the Sold while Check held it: it waited for something else. add and count wait only for the Sold\'s own lock.'
          }
        ],
        { calls: 'the calls to the Sold' }
      )
    },

    numbers: {
      task: 2,
      stub: `${CHECK_THREADS}\n${LOCK}\n${NUMBERS}`,
      cases: [
        threaded({
          name: 'next gives back the next number, from one window',
          setup: ['java.util.concurrent.atomic.AtomicInteger last = new java.util.concurrent.atomic.AtomicInteger(40);', 'Numbers numbers = new Numbers(last);'],
          call: 'java.util.List.of(numbers.next(), numbers.next(), numbers.next())',
          type: 'java.util.List<Integer>',
          show: 'AtomicInteger last = new AtomicInteger(40);\nNumbers numbers = new Numbers(last);\nList<Integer> got = List.of(numbers.next(), numbers.next(), numbers.next());',
          after: { 'last afterwards': 'last.get()' },
          expected: { got: [41, 42, 43], 'last afterwards': 43 },
          kind: 'one',
          hint: 'next should add 1 to the AtomicInteger it was given and give back the new number.'
        }),
        threaded({
          name: 'four windows taking numbers at once never get the same one',
          call: 'CheckNumbers.rounds(20, 4, 300, (last) -> new Numbers(last), (n) -> n.next())',
          type: 'String',
          wait: 2500,
          show: '// 20 rounds; each round a new AtomicInteger, and 4 threads at once, each 300 times:\nnumbers.next();',
          expected: { got: '0 of 20 rounds gave a number twice, 0 missed a number, 0 left a wrong last number' },
          kind: 'many',
          hint: 'With any number of threads at once, every number from one more than the start to the last comes out exactly once.'
        })
      ],
      judge: judge(
        [
          {
            when: (r) => r.case.kind === 'one' && JSON.stringify(r.values.got?.items) === JSON.stringify(['40', '41', '42']),
            hint: 'next gives back the number as it was before the add, so the first ticket gets the last number already given out. The task gives back the new number, after the add.'
          },
          {
            when: (r) => r.case.kind === 'one' && Number(value(r, 'last afterwards')) === 40,
            hint: 'The AtomicInteger Check handed over still holds 40 afterwards: the numbers come from somewhere else. Numbers keeps the AtomicInteger its constructor is given and counts with it, so that every window shares one count.'
          },
          {
            when: (r) => r.case.kind === 'many' && /^[1-9]/.test(value(r, 'got') ?? ''),
            hint: 'Some rounds gave two windows the same number: next reads the number in one step and writes the new one in another, and between the two another thread does the same. An AtomicInteger can add and give back the new value in one step that no other thread can come between. Your terminal may show no clash on a run, by luck; Check runs many rounds at once.'
          },
          {
            when: (r) => r.case.kind === 'many',
            hint: 'Some rounds missed a number or left the AtomicInteger at a wrong last number: next adds exactly 1 each time, in one step, and gives back the new number.'
          }
        ],
        { calls: 'the calls to next' }
      )
    },

    takings: {
      task: 3,
      stub: `${CHECK_THREADS}\n${LOCK}\n${PRINTER}`,
      cases: [
        threaded({
          name: 'sell prints each ticket and adds up the takings',
          setup: ['Takings takings = new Takings();', 'CheckPrinter printer = new CheckPrinter(takings);'],
          call: 'takings.sell(new java.math.BigDecimal("3.40"), printer); takings.sell(new java.math.BigDecimal("0.85"), printer)',
          show: 'Takings takings = new Takings();\ntakings.sell(new BigDecimal("3.40"), printer);\ntakings.sell(new BigDecimal("0.85"), printer);\nBigDecimal total = takings.total();',
          after: {
            'tickets printed': 'printer.printed()',
            total: 'takings.total() == null ? null : takings.total().toPlainString()',
            'the total is 4.25': 'takings.total() != null && takings.total().compareTo(new java.math.BigDecimal("4.25")) == 0'
          },
          expected: { 'tickets printed': ['3.40', '0.85'], 'the total is 4.25': true },
          kind: 'plain',
          hint: 'sell should print the ticket for the fare once and add the fare to the takings; total gives back the takings.'
        }),
        threaded({
          name: 'sell waits for the lock of the Takings to add, and prints outside it',
          setup: ['Takings takings = new Takings();', 'CheckPrinter printer = new CheckPrinter(takings);', 'CheckPrinter other = new CheckPrinter(new Object());'],
          call: 'CheckLock.hold(takings, () -> takings.sell(new java.math.BigDecimal("3.40"), printer), () -> takings.sell(new java.math.BigDecimal("1.00"), other))',
          type: 'String',
          show: 'Takings takings = new Takings();\n// Check holds the lock of takings, and another thread calls:\ntakings.sell(new BigDecimal("3.40"), printer);\n// While it waits, Check sells a ticket for 1.00 itself, then lets go.',
          after: {
            'while Check held the lock': 'got',
            'printed while holding the lock': 'printer.inLock',
            total: 'takings.total() == null ? null : takings.total().toPlainString()',
            'the total is 4.40': 'takings.total() != null && takings.total().compareTo(new java.math.BigDecimal("4.40")) == 0'
          },
          expected: { 'while Check held the lock': 'waited', 'printed while holding the lock': false, 'the total is 4.40': true },
          kind: 'lock',
          hint: 'sell should print outside the lock, then wait for the lock of the Takings and add the fare to the takings as they are once it has it.'
        }),
        threaded({
          name: 'total waits for the lock of the Takings',
          setup: ['Takings takings = new Takings();', 'CheckPrinter other = new CheckPrinter(new Object());'],
          call: 'CheckLock.hold(takings, () -> takings.total(), () -> takings.sell(java.math.BigDecimal.ONE, other))',
          type: 'String',
          show: 'Takings takings = new Takings();\n// Check holds the lock of takings, and another thread calls:\ntakings.total();',
          after: { 'while Check held the lock': 'got' },
          expected: { 'while Check held the lock': 'waited' },
          kind: 'total',
          hint: 'total should wait for the lock of the Takings too.'
        }),
        threaded({
          name: 'four windows selling at once lose no fare',
          setup: ['Takings takings = new Takings();', 'CheckPrinter printer = new CheckPrinter(takings);'],
          call: 'CheckRounds.run(4, 250, 3, () -> takings.sell(new java.math.BigDecimal("0.10"), printer))',
          wait: 2500,
          show: 'Takings takings = new Takings();\n// 4 threads at once, 3 rounds, each thread 250 times:\ntakings.sell(new BigDecimal("0.10"), printer);',
          after: {
            total: 'takings.total() == null ? null : takings.total().toPlainString()',
            'the total is 300.00': 'takings.total() != null && takings.total().compareTo(new java.math.BigDecimal("300.00")) == 0',
            'tickets printed': 'printer.printed().size()'
          },
          expected: { 'the total is 300.00': true, 'tickets printed': 3000 },
          kind: 'many',
          hint: 'Every fare sold counts: with the lock, no fare is lost however many threads sell at once.'
        })
      ],
      judge: judge(
        [
          { ...held('sell', 'Takings', "Takings'"), when: (r) => r.case.kind === 'lock' && value(r, 'while Check held the lock') === 'finished' },
          {
            when: (r) => r.case.kind === 'plain' && value(r, 'total') === '0',
            hint: 'The takings stay 0 however many tickets are sold. A BigDecimal never changes: add gives back a new BigDecimal with the sum, and the takings have to be given that new one.'
          },
          {
            when: (r) => r.case.kind === 'total' && value(r, 'while Check held the lock') === 'finished',
            hint: 'total finished while Check held the lock of the Takings, so it reads the takings without the lock, and may see an old value. The task makes total synchronized.'
          },
          {
            when: (r) => r.case.kind === 'lock' && value(r, 'printed while holding the lock') === 'true',
            hint: 'The ticket was printed while sell held the lock of the Takings, so while one window prints, the other cannot sell at all. Only the adding needs the lock: keep the printing outside the synchronized part.'
          },
          {
            when: (r) => r.case.kind === 'lock' && value(r, 'while Check held the lock') === 'waited' && value(r, 'total') === '3.40',
            hint: 'sell waits for the lock, and still lost the 1.00 Check sold while it waited: it worked out the new takings before it had the lock, and wrote them back afterwards. A BigDecimal never changes, add gives back a new one, so reading the takings, adding and keeping the result all happen while the lock is held.'
          },
          {
            when: (r) => value(r, 'while Check held the lock') === 'neither',
            hint: 'The other thread neither finished nor waited for the lock of the Takings while Check held it: it waited for something else. sell and total wait only for the Takings\' own lock.'
          }
        ],
        { calls: 'the calls to the Takings' }
      )
    }
  }
})
