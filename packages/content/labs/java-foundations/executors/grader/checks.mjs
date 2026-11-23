import { CHECK_THREADS, explainThread, fail, outcome, outcomeCases, pass, tasks, threaded, threadWords } from '../../grading.mjs'

const FILE = 'Bookings.java'
const value = (r, name) => r.values[name]?.value ?? null
const items = (r, name) => r.values[name]?.items ?? null
const text = (s) => JSON.stringify(s)
const list = (xs) => `new java.util.ArrayList<>(java.util.List.of(${xs.map(text).join(', ')}))`

// Check's office. With hold, a job waits until the thread that handed out the jobs is waiting for
// their answers (in get, invokeAll or awaitTermination), or has returned. At that moment Check
// counts the threads alive besides that one: every thread the pool has made so far, since a fixed
// pool makes one per job up to its size as the jobs are handed over. So "how many at once" is
// counted, not timed: a pool of three always shows three, get straight after each submit always
// shows one, a pool as big as the list shows the whole list. It also notes whether the waiting
// was inside invokeAll, and every thread that ran a job.
const OFFICE = `final class CheckOffice implements Office {
    private final java.util.Map<String, String> failing = new java.util.HashMap<>();
    private final java.util.Set<Thread> ran = new java.util.HashSet<>();
    private final boolean hold;
    int calls, workers = -1;
    volatile boolean open, early, onCaller, inInvokeAll, letGo;
    CheckOffice(boolean hold, String... fails) {
        this.hold = hold;
        for (int i = 0; i + 1 < fails.length; i += 2) failing.put(fails[i], fails[i + 1]);
        if (!hold) open = true;
    }
    public String confirm(String booking) throws java.io.IOException {
        Thread me = Thread.currentThread();
        synchronized (this) { calls++; ran.add(me); if (me == CheckRun.caller) onCaller = true; }
        if (hold && me != CheckRun.caller && !CheckRun.until(1000, () -> open)) letGo = true;
        String why = failing.get(booking);
        if (why != null) throw new java.io.IOException(why);
        return "Confirmed: " + booking;
    }
    synchronized int threads() { return ran.size(); }
    synchronized void watch() {
        Thread c = CheckRun.caller;
        if (open) return;
        if (!c.isAlive()) { early = true; open = true; return; }
        if (CheckRun.waiting(c)) {
            workers = CheckRun.others(c).size();
            for (StackTraceElement e : c.getStackTrace()) if (e.getClassName().equals("java.util.concurrent.AbstractExecutorService") && e.getMethodName().equals("invokeAll")) inInvokeAll = true;
            open = true;
        }
    }
    void again() { synchronized (this) { open = !hold; early = false; workers = -1; inInvokeAll = false; } }
}
// The caller's pool, as Check hands it over: a real pool of two, and a note of any shutdown.
final class CheckPool extends java.util.concurrent.AbstractExecutorService {
    final java.util.concurrent.ExecutorService inner = java.util.concurrent.Executors.newFixedThreadPool(2);
    volatile boolean shut;
    public void shutdown() { shut = true; inner.shutdown(); }
    public java.util.List<Runnable> shutdownNow() { shut = true; return inner.shutdownNow(); }
    public boolean isShutdown() { return inner.isShutdown(); }
    public boolean isTerminated() { return inner.isTerminated(); }
    public boolean awaitTermination(long t, java.util.concurrent.TimeUnit u) throws InterruptedException { return inner.awaitTermination(t, u); }
    public void execute(Runnable r) { inner.execute(r); }
    void end() { inner.shutdownNow(); }
}`

const quiet = (d) => (d.output ? { ...d, output: d.output.replace(/\n {2}(?:still waiting|threads left running) is null(?=\n)/g, '') } : d)

function judge(mistakes, { calls }) {
  return (runs, ctx) =>
    outcomeCases({ file: FILE, explain: explainThread })(runs, ctx).map((d, i) => {
      const r = runs[i]
      const stuck = value(r, 'still waiting')
      if (stuck) {
        const m = mistakes.find((k) => k.stuck && k.when(r, ctx))
        return quiet(fail(d.name, m?.hint ?? `Check waited for ${calls} to return, and it did not. When Check stopped waiting there was ${threadWords(stuck, FILE)}.`, d.output))
      }
      const left = value(r, 'threads left running')
      const m = d.passed && !left ? null : mistakes.find((k) => !k.stuck && k.when(r, ctx))
      if (m) return quiet({ ...d, passed: false, message: typeof m.hint === 'function' ? m.hint(r) : m.hint })
      if (left) return quiet(fail(d.name, `${d.passed ? 'The answer is right, and when' : 'When'} ${calls} returned it left behind ${threadWords(left, FILE)}. Those threads wait for jobs for ever, and in a program of their own they keep it from ending.`, d.output))
      return quiet(d)
    })
}

const ONE_AT_A_TIME = (pool) => ({
  when: (r) => r.case.size > 1 && Number(value(r, 'threads alive when the answers were first awaited')) === 1,
  hint: `When the first answer was awaited, the ${pool} had only one job's thread going, so the bookings went one after another, as with no pool at all. A get straight after each job is handed over waits for that job before the next one is handed over: hand over every job first, then get the answers.`
})

const BOOKINGS = {
  five: ['Dipper party, 4', 'Mr Lamont, 1', 'Siskin walkers, 7', 'Breac anglers, 3', 'Mrs Oag, 2'],
  two: ['Mr Lamont, 1', 'Siskin walkers, 7'],
  four: ['Dipper party, 4', 'Two cyclists, 2', 'Mr Lamont, 1', 'Breac anglers, 3']
}

const confirmed = (xs) => xs.map((b) => `Confirmed: ${b}`)
const atMost = (n, size) => Math.min(n, size)

// --- Task 3: steps of a day at the desk, each through CheckRun ----------------------------------

const STEP = (name, call, then = '') =>
  `if (stuck == null && thrown == null) { step = ${text(name)}; try { ${call}; } catch (CheckStuck x$) { stuck = x$.what; } catch (Throwable x$) { thrown = x$; } ${then} }`

const READS = {
  thrown: 'thrown == null ? null : thrown.getClass().getName()',
  'thrown.message': 'thrown == null ? null : thrown.getMessage()',
  'thrown.frames': 'thrown == null ? null : java.util.Arrays.toString(thrown.getStackTrace())',
  'thrown.cause': 'thrown == null || thrown.getCause() == null ? null : thrown.getCause().getClass().getName()',
  'thrown.cause.message': 'thrown == null || thrown.getCause() == null ? null : thrown.getCause().getMessage()',
  'thrown.cause.frames': 'thrown == null || thrown.getCause() == null ? null : java.util.Arrays.toString(thrown.getCause().getStackTrace())',
  step: 'step',
  'still waiting': 'stuck'
}

function deskDay() {
  return {
    name: 'one desk confirms two lists with the same two threads, then closes',
    kind: 'day',
    code: [
      'CheckOffice office = new CheckOffice(true);',
      'Throwable thrown = null; String stuck = null; String step = ""; Desk desk = null; java.util.List<String> first = null, second = null; int firstWorkers = -1; boolean firstInvokeAll = false;',
      'Runnable probe$ = () -> { try { new Desk(1).confirmAll(null, null); } catch (InterruptedException | ExecutionException e$) { } };',
      STEP('new Desk(2)', 'desk = CheckRun.call(1000, () -> new Desk(2))'),
      'final Desk d = desk;',
      'CheckRun.watch = office::watch;',
      STEP('the first confirmAll', `first = CheckRun.call(1500, () -> d.confirmAll(${list(BOOKINGS.four)}, office))`, 'firstWorkers = office.workers; firstInvokeAll = office.inInvokeAll; office.again();'),
      STEP('the second confirmAll', `second = CheckRun.call(1500, () -> d.confirmAll(${list(BOOKINGS.two)}, office))`),
      STEP('close', 'CheckRun.call(1000, () -> { d.close(); return null; })')
    ],
    reads: {
      ...READS,
      'first answer': 'first',
      'second answer': 'second',
      'threads alive when the answers were first awaited': 'firstWorkers',
      'awaited inside invokeAll': 'firstInvokeAll',
      'threads that ran the jobs of both lists': 'office.threads()',
      'confirmed on the calling thread': 'office.onCaller',
      'threads left running after close': 'stuck != null ? null : CheckRun.settle(500)'
    },
    show: `Desk desk = new Desk(2);\nList<String> first = desk.confirmAll(List.of(${BOOKINGS.four.map(text).join(', ')}), office);\nList<String> second = desk.confirmAll(List.of(${BOOKINGS.two.map(text).join(', ')}), office);\ndesk.close();`
  }
}

function deskClosed() {
  return {
    name: 'a closed desk takes no more bookings',
    kind: 'closed',
    code: [
      'CheckOffice office = new CheckOffice(false);',
      'Throwable thrown = null; String stuck = null; String step = ""; Desk desk = null; java.util.List<String> late = null;',
      STEP('new Desk(3)', 'desk = CheckRun.call(1000, () -> new Desk(3))'),
      'final Desk d = desk;',
      STEP('close', 'CheckRun.call(1000, () -> { d.close(); return null; })'),
      STEP('confirmAll after close', `late = CheckRun.call(1000, () -> d.confirmAll(${list(['Mr Lamont, 1'])}, office))`)
    ],
    reads: { ...READS, 'answer after close': 'late', 'threads left running after close': 'stuck != null ? null : CheckRun.settle(500)' },
    show: 'Desk desk = new Desk(3);\ndesk.close();\ndesk.confirmAll(List.of("Mr Lamont, 1"), office);'
  }
}

function deskFails() {
  return {
    name: 'a failed booking reaches the caller, and the desk keeps working',
    kind: 'fails',
    code: [
      'CheckOffice office = new CheckOffice(false, "Two cyclists, 2", "no room for bicycles");',
      'Throwable thrown = null, failed = null; String stuck = null; String step = ""; Desk desk = null; java.util.List<String> after = null;',
      STEP('new Desk(2)', 'desk = CheckRun.call(1000, () -> new Desk(2))'),
      'final Desk d = desk;',
      `if (stuck == null && thrown == null) { step = "confirmAll with a booking that fails"; try { CheckRun.call(1500, () -> d.confirmAll(${list(BOOKINGS.four)}, office)); } catch (CheckStuck x$) { stuck = x$.what; } catch (Throwable x$) { failed = x$; } }`,
      STEP('confirmAll after the failure', `after = CheckRun.call(1500, () -> d.confirmAll(${list(BOOKINGS.two)}, office))`),
      STEP('close', 'CheckRun.call(1000, () -> { d.close(); return null; })')
    ],
    reads: {
      ...READS,
      'what the failing list threw': 'failed == null ? null : failed.getClass().getSimpleName()',
      'its cause': 'failed == null || failed.getCause() == null ? null : failed.getCause().getClass().getSimpleName()',
      'answer after the failure': 'after',
      'threads left running after close': 'stuck != null ? null : CheckRun.settle(500)'
    },
    show: `Desk desk = new Desk(2);\ndesk.confirmAll(List.of(${BOOKINGS.four.map(text).join(', ')}), office);   // "Two cyclists, 2" fails\nList<String> after = desk.confirmAll(List.of(${BOOKINGS.two.map(text).join(', ')}), office);\ndesk.close();`
  }
}

const SHOWN = {
  day: ['first answer', 'second answer', 'threads alive when the answers were first awaited', 'awaited inside invokeAll', 'threads that ran the jobs of both lists'],
  closed: ['answer after close'],
  fails: ['what the failing list threw', 'its cause', 'answer after the failure']
}

function deskJudge(runs, ctx) {
  return runs.map((r) => {
    const c = r.case
    const v = (n) => value(r, n)
    const its = (n) => items(r, n)
    const said = quiet({ output: outcome(r, 'Bookings', SHOWN[c.kind], ctx.text.split('\n').length) }).output
    const no = (message) => fail(c.name, message, said)
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
    if (v('still waiting')) return no(`Check waited for ${v('step')} to return, and it did not. When Check stopped waiting there was ${threadWords(v('still waiting'), FILE)}.`)
    const thrown = v('thrown')
    if (c.kind === 'closed') {
      if (thrown && /RejectedExecutionException$/.test(thrown) && v('step') === 'confirmAll after close') return pass(c.name, said)
      if (!thrown) return no('confirmAll still confirmed a booking after close. A desk that is closed takes no more bookings: once its pool is shut down, the pool refuses new jobs with a RejectedExecutionException, and confirmAll lets that reach the caller. A new pool made inside confirmAll would take them.')
    }
    if (thrown) {
      const name = thrown.split('.').pop()
      const frames = (v('thrown.frames') ?? '[]').slice(1, -1).split(', ').filter(Boolean)
      const why = explainThread({ type: thrown, message: v('thrown.message'), frames })
      if (name === 'RejectedExecutionException' && v('step') !== 'close' && v('step') !== 'confirmAll after close')
        return no(`${v('step')} threw a RejectedExecutionException: the desk's pool was already shut down. confirmAll leaves the pool open, a failed booking too; only close shuts it.`)
      return no(`${v('step')} threw ${/^[AEIOU]/.test(name) ? 'an' : 'a'} ${name}.${why ? ` ${why}` : ''}`)
    }
    if (c.kind === 'fails') {
      if (v('what the failing list threw') !== 'ExecutionException') return no('A booking failed, and confirmAll did not let the ExecutionException that get throws reach the caller. A catch that swallows it hides the failed booking.')
      if (v('its cause') !== 'IOException') return no('The ExecutionException should have the job\'s IOException as its cause.')
      if (!same(its('answer after the failure'), confirmed(BOOKINGS.two))) return no('After a failed booking, the desk should confirm the next list as before.')
    }
    if (c.kind === 'day') {
      if (v('confirmed on the calling thread') === 'true') return no('A booking was confirmed on the thread that called confirmAll, so the desk\'s pool did not do the work.')
      if (!same(its('first answer'), confirmed(BOOKINGS.four)) || !same(its('second answer'), confirmed(BOOKINGS.two))) return no('confirmAll should give back the confirmations in the order of the bookings, every time it is called.')
      if (Number(v('threads that ran the jobs of both lists')) > 2)
        return no(`${v('threads that ran the jobs of both lists')} threads ran the jobs of the two lists, and the desk was made with two. A desk keeps one pool for the day and hands every list to it; a pool made for each list, or a thread for each booking, makes new threads every time.`)
      if (Number(v('threads alive when the answers were first awaited')) === 1)
        return no('When the first answer was awaited, the pool had only one job\'s thread going, so the bookings went one after another. invokeAll hands over every job at once, then waits for all of them.')
      if (v('awaited inside invokeAll') !== 'true')
        return no('confirmAll gets the answers right, and it waits for them outside invokeAll. The task hands the jobs over all at once with invokeAll, which gives back the futures in the order of the jobs.')
    }
    if (v('threads left running after close'))
      return no(`After close, the desk left behind ${threadWords(v('threads left running after close'), FILE)}. close shuts the pool down, so that its threads end and the program can end.`)
    return pass(c.name, said)
  })
}

export const checks = tasks({
  file: FILE,
  objects: true,
  families: true,
  exceptions: true,
  collections: true,
  functions: true,
  values: true,
  tasks: {
    batch: {
      task: 1,
      stub: `${CHECK_THREADS}\n${OFFICE}`,
      cases: [
        ...[BOOKINGS.five, BOOKINGS.two, []].map((bookings, i) =>
          threaded({
            name: bookings.length ? `confirmAll confirms ${bookings.length} bookings with three threads` : 'confirmAll of no bookings',
            setup: ['CheckOffice office = new CheckOffice(true);', 'CheckRun.watch = office::watch;', ...(i === 0 ? ['Runnable probe$ = () -> { try { Batch.confirmAll(null, null); } catch (InterruptedException | ExecutionException e$) { } };'] : [])],
            call: `Batch.confirmAll(${list(bookings)}, office)`,
            type: 'java.util.List<String>',
            show: `Office office = Check's office;\nList<String> got = Batch.confirmAll(List.of(${bookings.map(text).join(', ')}), office);`,
            after: {
              'calls of confirm': 'office.calls',
              'threads alive when the answers were first awaited': 'office.workers',
              'threads that ran the jobs': 'office.threads()',
              'confirmed on the calling thread': 'office.onCaller',
              'Check let a job go after waiting': 'office.letGo'
            },
            expected: {
              got: confirmed(bookings),
              'calls of confirm': bookings.length,
              'confirmed on the calling thread': false,
              'Check let a job go after waiting': false,
              ...(bookings.length ? { 'threads alive when the answers were first awaited': atMost(3, bookings.length), 'threads that ran the jobs': atMost(3, bookings.length) } : {})
            },
            size: bookings.length,
            hint: 'confirmAll should hand a pool of three threads one job per booking, then get every answer, in the order of the bookings.'
          })
        ),
        threaded({
          name: 'a booking that fails reaches the caller, and the pool is still shut down',
          setup: ['CheckOffice office = new CheckOffice(false, "Two cyclists, 2", "no room for bicycles");'],
          call: `Batch.confirmAll(${list(BOOKINGS.four)}, office)`,
          type: 'java.util.List<String>',
          show: `Office office = Check's office, which fails "Two cyclists, 2";\nList<String> got = Batch.confirmAll(List.of(${BOOKINGS.four.map(text).join(', ')}), office);`,
          after: { 'its cause': 'thrown == null || thrown.getCause() == null ? null : thrown.getCause().getClass().getSimpleName()' },
          throws: 'ExecutionException',
          expected: { 'its cause': 'IOException' },
          kind: 'fails',
          size: 4,
          hint: 'A booking whose job throws reaches the caller as the ExecutionException that get throws, with the job\'s IOException as its cause.'
        })
      ],
      judge: judge(
        [
          {
            when: (r) => value(r, 'confirmed on the calling thread') === 'true',
            hint: 'A booking was confirmed on the thread that called confirmAll, so no pool did the work. Each booking becomes a job handed to the pool, and the pool\'s threads run them.'
          },
          {
            when: (r) => r.case.size > 1 && Number(value(r, 'threads that ran the jobs')) === 1,
            hint: 'Only one thread ran the jobs, so the bookings went one after another. The task asks for a pool of exactly three threads.'
          },
          ONE_AT_A_TIME('pool'),
          {
            stuck: true,
            when: (r, ctx) => /\bshutdownNow\s*\(/.test(ctx.section),
            hint: 'confirmAll waits for an answer that never comes. A pool stopped with shutdownNow drops the jobs still waiting in its queue, so their futures never get an answer, and get waits for one for ever.'
          },
          {
            when: (r) => Number(value(r, 'threads alive when the answers were first awaited')) > 3 || Number(value(r, 'threads that ran the jobs')) > 3,
            hint: (r) => `${Math.max(Number(value(r, 'threads alive when the answers were first awaited')), Number(value(r, 'threads that ran the jobs')))} threads worked on the jobs, and the task allows three. A pool of a fixed size makes that many threads and no more, and a new pool, or a new thread, for each booking makes one per booking.`
          },
          {
            when: (r) => value(r, 'Check let a job go after waiting') === 'true',
            hint: 'confirmAll never waited for the answers the way the lesson shows, so Check let the jobs go after a second. A future\'s get waits for its job and gives back what it gave back.'
          },
          {
            when: (r) => r.case.kind === 'fails' && !value(r, 'thrown') && !value(r, 'threads left running'),
            hint: 'A booking failed, and confirmAll gave back an answer as if it had not. The task lets the ExecutionException that get throws reach the caller: a catch that swallows it hides the failed booking.'
          },
          {
            when: (r) => r.case.kind === 'fails' && value(r, 'threads left running'),
            hint: (r) => `A booking failed, its ExecutionException reached the caller, and the pool was left open: ${threadWords(value(r, 'threads left running'), FILE)}. The pool is shut down whatever happens, a failed get too: part 5 showed the block that always runs.`
          }
        ],
        { calls: 'confirmAll' }
      )
    },

    careful: {
      task: 2,
      stub: `${CHECK_THREADS}\n${OFFICE}`,
      cases: [
        threaded({
          name: 'confirmEach keeps going past the bookings that fail',
          setup: ['CheckOffice office = new CheckOffice(false, "Mr Lamont, 1", "no answer from the office", "Mrs Oag, 2", "the 10:00 is full");', 'CheckPool pool = new CheckPool();', 'java.util.List<String> problems = new java.util.ArrayList<>();', 'Runnable probe$ = () -> { try { Careful.confirmEach(null, null, null, null); } catch (InterruptedException e$) { } };'],
          call: `Careful.confirmEach(pool, ${list(BOOKINGS.five)}, office, problems)`,
          type: 'java.util.List<String>',
          show: `ExecutorService pool = Check's pool of two;\nOffice office = Check's office, which fails "Mr Lamont, 1" and "Mrs Oag, 2";\nList<String> problems = new ArrayList<>();\nList<String> got = Careful.confirmEach(pool, List.of(${BOOKINGS.five.map(text).join(', ')}), office, problems);`,
          after: { 'problems afterwards': 'problems', 'the pool left open': '!pool.shut', 'calls of confirm': 'office.calls' },
          expected: { got: confirmed(['Dipper party, 4', 'Siskin walkers, 7', 'Breac anglers, 3']), 'problems afterwards': ['Mr Lamont, 1: no answer from the office', 'Mrs Oag, 2: the 10:00 is full'], 'the pool left open': true, 'calls of confirm': 5 },
          kind: 'two',
          hint: 'confirmEach should give back the confirmations of the bookings that worked, in order, and add a problem for each booking that failed: the booking, a colon and a space, and the message of what its job threw.'
        }),
        threaded({
          name: 'confirmEach with no failures',
          setup: ['CheckOffice office = new CheckOffice(false);', 'CheckPool pool = new CheckPool();', 'java.util.List<String> problems = new java.util.ArrayList<>();'],
          call: `Careful.confirmEach(pool, ${list(BOOKINGS.two)}, office, problems)`,
          type: 'java.util.List<String>',
          show: `ExecutorService pool = Check's pool of two;\nList<String> problems = new ArrayList<>();\nList<String> got = Careful.confirmEach(pool, List.of(${BOOKINGS.two.map(text).join(', ')}), office, problems);`,
          after: { 'problems afterwards': 'problems', 'the pool left open': '!pool.shut' },
          expected: { got: confirmed(BOOKINGS.two), 'problems afterwards': [], 'the pool left open': true },
          kind: 'none',
          hint: 'With no failures, confirmEach gives back every confirmation in order, and problems stays empty.'
        }),
        threaded({
          name: 'confirmEach when every booking fails',
          setup: ['CheckOffice office = new CheckOffice(false, "Dipper party, 4", "the line dropped", "Breac anglers, 3", "the line dropped again");', 'CheckPool pool = new CheckPool();', 'java.util.List<String> problems = new java.util.ArrayList<>();'],
          call: `Careful.confirmEach(pool, ${list(['Dipper party, 4', 'Breac anglers, 3'])}, office, problems)`,
          type: 'java.util.List<String>',
          show: `ExecutorService pool = Check's pool of two;\nList<String> problems = new ArrayList<>();\nList<String> got = Careful.confirmEach(pool, List.of("Dipper party, 4", "Breac anglers, 3"), office, problems);`,
          after: { 'problems afterwards': 'problems', 'the pool left open': '!pool.shut' },
          expected: { got: [], 'problems afterwards': ['Dipper party, 4: the line dropped', 'Breac anglers, 3: the line dropped again'], 'the pool left open': true },
          kind: 'all',
          hint: 'With every booking failing, confirmEach gives back no confirmations and a problem for each booking.'
        })
      ],
      judge: judge(
        [
          {
            when: (r) => value(r, 'the pool left open') === 'false',
            hint: 'confirmEach shut down the pool it was handed. That pool belongs to the caller, who may have more jobs for it: a method shuts down only a pool it made itself.'
          },
          {
            when: (r) => r.case.kind !== 'none' && (items(r, 'problems afterwards') ?? []).length === 0 && !value(r, 'thrown'),
            hint: 'Bookings failed, and problems stays empty: the ExecutionException was caught and dropped. Whoever reads the list needs to know which bookings to ring back: each one goes into problems.'
          },
          {
            when: (r) => (items(r, 'problems afterwards') ?? []).some((p) => /Exception/.test(p)),
            hint: 'A problem holds the name of an exception class. The ExecutionException\'s own message is the name and message of what the job threw; the task wants only the job\'s message. What the job threw is the ExecutionException\'s cause.'
          },
          {
            when: (r) => r.case.kind === 'two' && (items(r, 'problems afterwards') ?? []).length === 1,
            hint: 'Only the first failed booking is in problems, and the bookings after it were not read: the try is around the whole loop, so the first failure ends the loop. Put it around the one get that can fail.'
          },
          {
            when: (r) => value(r, 'thrown') && /ExecutionException$/.test(value(r, 'thrown')),
            hint: 'An ExecutionException reached Check. confirmEach catches it for each booking, notes the problem, and goes on.'
          }
        ],
        { calls: 'confirmEach' }
      )
    },

    desk: {
      task: 3,
      stub: `${CHECK_THREADS}\n${OFFICE}`,
      cases: [deskDay(), deskClosed(), deskFails()],
      judge: deskJudge
    }
  }
})
