import { CHECK_THREADS, explainThread, fail, outcomeCases, tasks, threaded, threadWords } from '../../grading.mjs'

const FILE = 'QuayBoard.java'
const value = (r, name) => r.values[name]?.value ?? null
const items = (r, name) => r.values[name]?.items ?? null
const text = (s) => JSON.stringify(s)

// Check's map of counts. Two gangway threads of Check's own scan for the same boat at once. When
// one of them has read a count (get, getOrDefault, containsKey), it waits until the other has read
// it too, or is inside one of the map's own one-step changes (merge, compute, putIfAbsent, replace),
// or waits at a lock, or is done. So a scan that reads and then puts loses one gangway's tickets
// every time, and a scan done in one step of the map's never does. Other threads read as usual.
const COUNTS = `interface CheckWork { void run() throws Throwable; }
final class CheckCounts extends java.util.concurrent.ConcurrentHashMap<String, Integer> {
    private final java.util.Set<Thread> gangways = java.util.concurrent.ConcurrentHashMap.newKeySet();
    private final java.util.Set<Thread> read = java.util.concurrent.ConcurrentHashMap.newKeySet();
    private final java.util.Set<Thread> inStep = java.util.concurrent.ConcurrentHashMap.newKeySet();
    private final java.util.Set<Thread> done = java.util.concurrent.ConcurrentHashMap.newKeySet();
    private final ThreadLocal<int[]> depth = ThreadLocal.withInitial(() -> new int[1]);
    volatile boolean letGo;
    private Thread other(Thread me) { for (Thread t : gangways) if (t != me) return t; return null; }
    private void reading() {
        Thread me = Thread.currentThread();
        if (!gangways.contains(me) || depth.get()[0] > 0) return;
        read.add(me);
        Thread o = other(me);
        if (o != null && !CheckRun.until(1000, () -> read.contains(o) || inStep.contains(o) || done.contains(o) || o.getState() == Thread.State.TERMINATED || CheckRun.atLock(o))) letGo = true;
    }
    private <T> T step(java.util.function.Supplier<T> s) {
        Thread me = Thread.currentThread();
        int[] d = depth.get();
        if (d[0] == 0) inStep.add(me);
        d[0]++;
        try { return s.get(); } finally { if (--d[0] == 0) inStep.remove(me); }
    }
    private <T> T inner(java.util.function.Supplier<T> s) { int[] d = depth.get(); d[0]++; try { return s.get(); } finally { d[0]--; } }
    // The value is read first, then the meeting: both gangways hold what they read before either goes on.
    @Override public Integer get(Object k) { Integer x = inner(() -> super.get(k)); reading(); return x; }
    @Override public Integer getOrDefault(Object k, Integer v) { Integer x = inner(() -> super.getOrDefault(k, v)); reading(); return x; }
    @Override public boolean containsKey(Object k) { boolean x = inner(() -> super.containsKey(k)); reading(); return x; }
    @Override public Integer merge(String k, Integer v, java.util.function.BiFunction<? super Integer, ? super Integer, ? extends Integer> f) { return step(() -> super.merge(k, v, f)); }
    @Override public Integer compute(String k, java.util.function.BiFunction<? super String, ? super Integer, ? extends Integer> f) { return step(() -> super.compute(k, f)); }
    @Override public Integer computeIfAbsent(String k, java.util.function.Function<? super String, ? extends Integer> f) { return step(() -> super.computeIfAbsent(k, f)); }
    @Override public Integer computeIfPresent(String k, java.util.function.BiFunction<? super String, ? super Integer, ? extends Integer> f) { return step(() -> super.computeIfPresent(k, f)); }
    @Override public Integer putIfAbsent(String k, Integer v) { return step(() -> super.putIfAbsent(k, v)); }
    @Override public boolean replace(String k, Integer o, Integer n) { return step(() -> super.replace(k, o, n)); }
    // Both gangways scan at once; their work ends when both are done or a second has passed.
    String race(CheckWork a, CheckWork b) throws Exception {
        Throwable[] err = new Throwable[1];
        Thread[] ts = new Thread[2];
        CheckWork[] work = { a, b };
        for (int i = 0; i < 2; i++) {
            CheckWork w = work[i];
            ts[i] = new Thread(() -> { try { w.run(); } catch (Throwable x) { synchronized (err) { if (err[0] == null) err[0] = x; } } finally { done.add(Thread.currentThread()); } }, "gangway");
            gangways.add(ts[i]);
        }
        for (Thread t : ts) t.start();
        for (Thread t : ts) t.join(1500);
        if (err[0] instanceof Exception e) throw e;
        if (err[0] instanceof Error e) throw e;
        return toString();
    }
    static void rounds(int threads, int each, CheckWork work) throws Exception {
        Throwable[] err = new Throwable[1];
        java.util.concurrent.CyclicBarrier go = new java.util.concurrent.CyclicBarrier(threads);
        Thread[] ts = new Thread[threads];
        for (int i = 0; i < threads; i++) {
            ts[i] = new Thread(() -> { try { go.await(); for (int k = 0; k < each; k++) work.run(); } catch (Throwable x) { synchronized (err) { if (err[0] == null) err[0] = x; } } }, "gangway");
            ts[i].start();
        }
        for (Thread t : ts) t.join(1500);
        if (err[0] instanceof Exception e) throw e;
        if (err[0] instanceof Error e) throw e;
    }
}`

// Check's labeller. The label of the first booking waits until the label of the last booking has
// been made (or a second and a half has passed). A parallel stream always makes the last label on
// another thread meanwhile; one thread never can. And the last label is always made before the
// first, so whatever keeps the labels in the order they were made, not the order of the bookings,
// shows it every time.
const LABELLER = `final class CheckLabeller implements Labeller {
    private final String first, last;
    private final java.util.Set<Thread> on = new java.util.HashSet<>();
    volatile boolean lastDone, letGo;
    volatile int calls;
    CheckLabeller(String first, String last) { this.first = first; this.last = last; }
    public String label(String booking) {
        synchronized (this) { on.add(Thread.currentThread()); calls++; }
        if (booking.equals(first) && !booking.equals(last) && !CheckRun.until(1500, () -> lastDone)) letGo = true;
        String label = "label of " + booking;
        if (booking.equals(last)) lastDone = true;
        return label;
    }
    synchronized int threads() { return on.size(); }
}`

const quiet = (d) => (d.output ? { ...d, output: d.output.replace(/\n {2}(?:still waiting|threads left running) is null(?=\n)/g, '') } : d)

function judge(mistakes, { calls }) {
  return (runs, ctx) =>
    outcomeCases({ file: FILE, explain: explainThread })(runs, ctx).map((d, i) => {
      const r = runs[i]
      const stuck = value(r, 'still waiting')
      if (stuck) return quiet(fail(d.name, `Check waited for ${calls} to return, and it did not. When Check stopped waiting there was ${threadWords(stuck, FILE)}.`, d.output))
      if (d.passed) {
        const left = value(r, 'threads left running')
        return left ? quiet(fail(d.name, `The answer is right, and the call left behind ${threadWords(left, FILE)}. In a program of its own, a thread still alive keeps the program from ending.`, d.output)) : quiet(d)
      }
      const m = mistakes.find((k) => k.when(r, ctx))
      return quiet(m ? { ...d, message: typeof m.hint === 'function' ? m.hint(r) : m.hint } : d)
    })
}

const BOARD_STEPS = 'Board board = new Board();\nboard.post("09:00 Dipper to the island");\nboard.post("09:40 Siskin round the bay");\nIterator<String> reading = board.lines().iterator();\nreading.next();\n// another thread posts:\nboard.post("Siskin cancelled");\n// and the first goes on reading:\nwhile (reading.hasNext()) reading.next();'

export const checks = tasks({
  file: FILE,
  objects: true,
  families: true,
  exceptions: true,
  collections: true,
  functions: true,
  values: true,
  tasks: {
    scans: {
      task: 1,
      stub: `${CHECK_THREADS}\n${COUNTS}`,
      cases: [
        threaded({
          name: 'newCounts gives back a new, empty map for several threads',
          call: 'Scans.newCounts()',
          type: 'java.util.concurrent.ConcurrentMap<String, Integer>',
          show: 'ConcurrentMap<String, Integer> got = Scans.newCounts();\nConcurrentMap<String, Integer> other = Scans.newCounts();',
          after: {
            'empty': 'got != null && got.isEmpty()',
            'a new map each time': 'got != null && got != Scans.newCounts()'
          },
          expected: { empty: true, 'a new map each time': true },
          kind: 'new',
          hint: 'newCounts should give back a new, empty map each time it is called, of a kind that several threads can change at once.'
        }),
        ...[
          { name: 'two gangways scanning for a boat that has a count', start: 'Dipper', a: 3, b: 4, want: '{Dipper=17}' },
          { name: 'two gangways scanning for a boat that is not there yet', start: null, a: 2, b: 5, want: '{Dipper=7}' }
        ].map((c) =>
          threaded({
            name: c.name,
            setup: ['CheckCounts counts = new CheckCounts();', ...(c.start ? ['counts.put("Dipper", 10);'] : [])],
            call: `counts.race(() -> Scans.scan(counts, "Dipper", ${c.a}), () -> Scans.scan(counts, "Dipper", ${c.b}))`,
            type: 'String',
            show: `ConcurrentMap<String, Integer> counts = Check's map${c.start ? ' holding {Dipper=10}' : ', empty'};\n// two threads at once:\nScans.scan(counts, "Dipper", ${c.a});\nScans.scan(counts, "Dipper", ${c.b});`,
            after: { 'Check let a read go after waiting': 'counts.letGo' },
            expected: { got: c.want },
            kind: 'race',
            hint: 'Two scans for the same boat at the same moment should both count.'
          })
        ),
        threaded({
          name: 'four gangways scanning for three boats lose no ticket',
          setup: ['CheckCounts counts = new CheckCounts();', 'String[] boats = { "Dipper", "Siskin", "Breac" };', 'java.util.concurrent.atomic.AtomicInteger next = new java.util.concurrent.atomic.AtomicInteger();'],
          call: 'CheckCounts.rounds(4, 600, () -> Scans.scan(counts, boats[next.getAndIncrement() % 3], 1))',
          wait: 2500,
          show: 'ConcurrentMap<String, Integer> counts = Check\'s map, empty;\n// 4 threads at once, each 600 times, the boats in turn:\nScans.scan(counts, boat, 1);',
          after: { counts: 'new java.util.TreeMap<>(counts).toString()' },
          expected: { counts: '{Breac=800, Dipper=800, Siskin=800}' },
          kind: 'many',
          hint: 'Every scan counts, however many threads scan at once.'
        })
      ],
      judge: judge(
        [
          {
            when: (r) => r.case.kind === 'race' && /=(?:13|14|2|5)\}$/.test(value(r, 'got') ?? '') && value(r, 'got') !== r.case.expected.got,
            hint: 'One gangway\'s tickets were lost: scan reads the count, and then puts back a new one, and in between the other gangway read the same count. A ConcurrentHashMap is safe for each call by itself, not for two calls in a row. One of its methods does the reading, the adding and the putting in one step: the lesson shows it.'
          },
          {
            when: (r) => r.case.kind === 'new' && value(r, 'a new map each time') === 'false',
            hint: 'newCounts gives back the same map every time, so two days\' counts would mix. It makes a new map each time it is called.'
          }
        ],
        { calls: 'the scans' }
      )
    },

    board: {
      task: 2,
      stub: `${CHECK_THREADS}\n${COUNTS}`,
      cases: [
        threaded({
          name: 'the board keeps the lines in the order they were posted',
          setup: ['Board board = new Board();'],
          call: 'board.post("08:30 Breac to the pier"); board.post("09:00 Dipper to the island"); board.post("09:40 Siskin round the bay")',
          show: 'Board board = new Board();\nboard.post("08:30 Breac to the pier");\nboard.post("09:00 Dipper to the island");\nboard.post("09:40 Siskin round the bay");\nList<String> lines = board.lines();',
          after: { lines: 'board.lines()' },
          expected: { lines: ['08:30 Breac to the pier', '09:00 Dipper to the island', '09:40 Siskin round the bay'] },
          kind: 'order',
          hint: 'lines should give back every line posted, in the order they were posted.'
        }),
        threaded({
          name: 'one thread reads the board while another posts',
          setup: ['Board board = new Board();', 'java.util.List<String> read = new java.util.ArrayList<>();'],
          call: 'board.post("09:00 Dipper to the island"); board.post("09:40 Siskin round the bay"); java.util.Iterator<String> reading = board.lines().iterator(); read.add(reading.next()); Thread poster = new Thread(() -> board.post("Siskin cancelled")); poster.start(); poster.join(); while (reading.hasNext()) read.add(reading.next())',
          show: BOARD_STEPS,
          after: { 'lines read': 'read', 'lines afterwards': 'board.lines()' },
          expected: { 'lines afterwards': ['09:00 Dipper to the island', '09:40 Siskin round the bay', 'Siskin cancelled'] },
          kind: 'read',
          hint: 'A thread going through the lines should be able to finish while another thread posts, and the new line should be on the board afterwards.'
        }),
        threaded({
          name: 'four threads posting at once lose no line',
          setup: ['Board board = new Board();', 'java.util.concurrent.atomic.AtomicInteger n = new java.util.concurrent.atomic.AtomicInteger();'],
          call: 'CheckCounts.rounds(4, 250, () -> board.post("line " + n.incrementAndGet()))',
          wait: 2500,
          show: 'Board board = new Board();\n// 4 threads at once, each 250 times:\nboard.post("line " + number);',
          after: { 'lines on the board': 'board.lines().size()', 'every line once': 'new java.util.HashSet<>(board.lines()).size() == 1000' },
          expected: { 'lines on the board': 1000, 'every line once': true },
          kind: 'many',
          hint: 'Every line posted should be on the board, however many threads post at once.'
        })
      ],
      judge: judge(
        [
          {
            when: (r) => r.case.kind === 'read' && value(r, 'thrown') === 'java.util.ConcurrentModificationException',
            hint: 'A ConcurrentModificationException: the list lines gave back is the board\'s own list, and another thread posted to it while the first was going through it, so the loop stopped. A list made safe only by locks still breaks this way: going through it is many calls, not one. lines gives back a list that cannot change under the reader.'
          },
          {
            when: (r) => r.case.kind === 'read' && (items(r, 'lines read') ?? []).slice(0, 2).join('|') !== '09:00 Dipper to the island|09:40 Siskin round the bay',
            hint: 'The reader did not get the lines that were on the board when it started, in order.'
          },
          {
            when: (r) => r.case.kind === 'many' && /Exception$/.test(value(r, 'thrown') ?? ''),
            hint: 'Posting from four threads at once threw. A plain ArrayList is not safe for several threads at once: two adds at the same moment can break it.'
          },
          {
            when: (r) => r.case.kind === 'many',
            hint: 'Some lines posted by four threads at once are missing. A plain ArrayList is not safe for several threads at once: two adds at the same moment can overwrite each other. Your terminal may show no loss on a run, by luck; Check posts many lines at once.'
          }
        ],
        { calls: 'the board' }
      )
    },

    labels: {
      task: 3,
      stub: `${CHECK_THREADS}\n${LABELLER}`,
      cases: [
        threaded({
          name: 'labels makes the labels on several threads, in the order of the bookings',
          setup: ['CheckLabeller labeller = new CheckLabeller("Dipper party", "Mrs Oag");'],
          call: `Labels.labels(new java.util.ArrayList<>(java.util.List.of(${['Dipper party', 'Mr Lamont', 'Siskin walkers', 'Breac anglers', 'Two cyclists', 'School trip', 'Mr Ure', 'Mrs Oag'].map(text).join(', ')})), labeller)`,
          type: 'java.util.List<String>',
          wait: 2500,
          show: `List<String> got = Labels.labels(List.of(${['Dipper party', 'Mr Lamont', 'Siskin walkers', 'Breac anglers', 'Two cyclists', 'School trip', 'Mr Ure', 'Mrs Oag'].map(text).join(', ')}), labeller);`,
          after: { 'threads that made labels': 'labeller.threads()', 'calls of label': 'labeller.calls', 'Check let the first label go after waiting': 'labeller.letGo' },
          expected: {
            got: ['Dipper party', 'Mr Lamont', 'Siskin walkers', 'Breac anglers', 'Two cyclists', 'School trip', 'Mr Ure', 'Mrs Oag'].map((b) => `label of ${b}`),
            'calls of label': 8,
            'Check let the first label go after waiting': false
          },
          kind: 'many',
          hint: 'labels should make every label on several threads at once and give them back in the order of the bookings.'
        }),
        threaded({
          name: 'labels of one booking, and of none',
          setup: ['CheckLabeller labeller = new CheckLabeller("Mr Ure", "Mr Ure");'],
          call: 'Labels.labels(new java.util.ArrayList<>(java.util.List.of("Mr Ure")), labeller)',
          type: 'java.util.List<String>',
          show: 'List<String> got = Labels.labels(List.of("Mr Ure"), labeller);\nList<String> none = Labels.labels(List.of(), labeller);',
          after: { none: 'Labels.labels(new java.util.ArrayList<>(), labeller)' },
          expected: { got: ['label of Mr Ure'], none: [] },
          kind: 'small',
          hint: 'One booking gives one label, and no bookings give an empty list.'
        })
      ],
      judge: judge(
        [
          {
            when: (r) => r.case.kind === 'many' && Number(value(r, 'threads that made labels')) === 1,
            hint: 'Every label was made on one thread, so they were made one after another. A parallel stream shares the list out over several threads: the lesson shows how to ask a list for one.'
          },
          {
            when: (r) => r.case.kind === 'many' && (items(r, 'got') ?? []).length === 8 && [...(items(r, 'got') ?? [])].sort().join() === r.case.expected.got.slice().sort().join(),
            hint: 'Every label is there, out of order: the last booking\'s label came first. The labels were put into the list in the order they were made, and on several threads that order is not promised. A stream can collect what it maps in the order of the list it came from, however the work was shared out.'
          },
          {
            when: (r) => r.case.kind === 'many' && (items(r, 'got') ?? []).length < 8,
            hint: 'Some labels are missing. Several threads adding to one list at once can overwrite each other: let the stream collect the labels itself, and add to nothing outside it.'
          }
        ],
        { calls: 'labels' }
      )
    }
  }
})
