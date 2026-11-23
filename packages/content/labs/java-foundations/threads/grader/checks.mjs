import { CHECK_THREADS, threwOnThread, explainThread, fail, outcome, outcomeCases, pass, tasks, threaded, threadWords } from '../../grading.mjs'

const FILE = 'BusyHut.java'
const value = (r, name) => r.values[name]?.value ?? null
const items = (r, name) => r.values[name]?.items ?? null
const text = (s) => JSON.stringify(s)

// A thread prints with a number that changes from run to run: the output names it in words.
const quiet = (d) => (d.output ? { ...d, output: d.output.replace(/It gave back Thread\[[^\n]*/g, 'It gave back a thread.').replace(/\n {2}(?:still waiting|threads left running|a thread it started threw) is null(?=\n)/g, '') } : d)

/**
 * Judges threaded() cases: a call that never returned first, then the case's own known mistakes,
 * then outcomeCases, then threads left running behind a right answer.
 */
function judge(mistakes, { calls = 'the call' } = {}) {
  return (runs, ctx) =>
    outcomeCases({ file: FILE, explain: explainThread })(runs, ctx).map((d, i) => {
      const r = runs[i]
      const stuck = value(r, 'still waiting')
      if (stuck) {
        const m = mistakes.find((k) => k.stuck && k.when(r, ctx))
        return quiet(fail(d.name, m?.hint ?? `Check waited for ${calls} to return, and it did not. When Check stopped waiting it found ${threadWords(stuck, FILE)}.`, d.output))
      }
      const left = value(r, 'threads left running')
      const m = d.passed ? null : mistakes.find((k) => !k.stuck && k.when(r, ctx))
      if (m) return quiet({ ...d, message: typeof m.hint === 'function' ? m.hint(r) : m.hint })
      if (d.passed && left)
        return quiet(fail(d.name, `The answer is right, and when ${calls} returned it left behind ${threadWords(left, FILE)}. In a program of its own, a thread still alive keeps the program from ending.`, d.output))
      return quiet(threwOnThread(d, r, FILE, calls) ?? d)
    })
}

// --- Task 1 ---------------------------------------------------------------------------------------

// Check's speaker: a line said on another thread waits until announce has returned, or is waiting
// for another thread (in join, say), so a thread that is started and handed back at once always
// gets back first, and one that is waited for inside announce is seen waiting, every time.
const SPEAKER = `final class CheckSpeaker implements Speaker {
    private final java.util.List<String> said = new java.util.ArrayList<>();
    private final java.util.Set<Thread> on = new java.util.HashSet<>();
    volatile boolean onCaller, waited;
    public void say(String line) {
        Thread me = Thread.currentThread();
        Thread caller = CheckRun.caller;
        if (me == caller) onCaller = true;
        else if (!waited) {
            CheckRun.until(3000, () -> !caller.isAlive() || CheckRun.waiting(caller));
            if (caller.isAlive() && CheckRun.waiting(caller)) waited = true;
        }
        synchronized (this) { on.add(me); said.add(line); }
    }
    synchronized java.util.List<String> said() { return new java.util.ArrayList<>(said); }
    synchronized boolean onlyOn(Thread t) { return on.isEmpty() || (on.size() == 1 && on.contains(t)); }
}`

const ANNOUNCEMENTS = [
  ['The Dipper leaves at nine.', 'Dogs on a lead, please.', 'Tea is served on board.'],
  ['The Siskin is full.'],
  ['Breac sails late today.', 'Breac sails late today.', 'Tickets at the hut.', 'Mind the step.', 'Last call.'],
  []
]

// --- Task 2 ---------------------------------------------------------------------------------------

// Check's manifests share a gate: every count() made on a thread of its own waits until total is
// waiting for its threads (in join, say) or has returned. At that moment Check counts the threads
// total has started, so starting them all before the first wait is the only way to have them all.
// Then the counts are let through one at a time, each thread to its end before the next, so
// nothing depends on which thread the computer runs first. In interrupt mode Check interrupts the
// caller the first time it waits, as a hut closing early would.
const MANIFESTS = `final class CheckGate {
    private final java.util.List<Thread> held = new java.util.ArrayList<>();
    private Thread released;
    int calls, workers = -1;
    boolean open, early, onCaller, letGo, interrupt, interrupted;
    void enter() {
        Thread me = Thread.currentThread();
        synchronized (this) {
            calls++;
            if (me == CheckRun.caller) { onCaller = true; return; }
            held.add(me);
        }
        if (!CheckRun.until(1000, () -> mayGo(me))) synchronized (this) { letGo = true; held.remove(me); }
    }
    private synchronized boolean mayGo(Thread me) { return open && (early || released == me); }
    synchronized void watch() {
        Thread c = CheckRun.caller;
        if (!open) {
            if (!c.isAlive()) { early = true; open = true; }
            else if (CheckRun.waiting(c)) {
                if (workers < 0) workers = CheckRun.others(c).size();
                // In interrupt mode the caller is interrupted the first time it waits, and the counts
                // stay held until it has ended (a caller that goes on waiting gets them after a second).
                if (interrupt) { if (!interrupted) { interrupted = true; c.interrupt(); } return; }
                open = true;
            }
        }
        if (open && !early && (released == null || !released.isAlive()) && !held.isEmpty()) released = held.remove(0);
    }
}
final class CheckManifest implements Manifest {
    final CheckGate gate;
    final int passengers;
    CheckManifest(CheckGate gate, int passengers) { this.gate = gate; this.passengers = passengers; }
    public int count() { gate.enter(); return passengers; }
}`

const COUNTS = [[14, 5, 31], [8], [0, 12, 3, 40], []]

// --- Task 3 ---------------------------------------------------------------------------------------

// Check's bell. In mode HOLD the first ring is held until stop has been called and is waiting
// for the ringer to end, or has returned: the interrupt arrives while the ringer is ringing, and a
// stop that does not wait returns while the ringer is certainly still alive. In mode SLEEP Check
// waits until the ringer is asleep after its first ring, so the interrupt arrives in its sleep.
// In mode MANY the ringer rings a few times first. A ring after stop was called is counted.
const BELL = `final class CheckBell implements Bell {
    static final int HOLD = 0, SLEEP = 1, MANY = 2;
    final int mode;
    private final java.util.Set<Thread> on = new java.util.HashSet<>();
    volatile int rings, afterStop;
    volatile boolean onCaller, held, stopping, stopLeftEarly;
    CheckBell(int mode) { this.mode = mode; }
    public void ring() {
        Thread me = Thread.currentThread();
        synchronized (this) { on.add(me); }
        if (me == CheckRun.caller) { onCaller = true; return; }
        if (stopping) { afterStop++; return; }
        rings++;
        if (mode == HOLD && rings == 1) {
            held = true;
            CheckRun.until(1500, () -> stopping && (CheckRun.waiting(CheckRun.caller) || !CheckRun.caller.isAlive()));
            if (stopping && !CheckRun.caller.isAlive()) stopLeftEarly = true;
        }
    }
    boolean ready(Thread ringer) {
        if (mode == HOLD) return CheckRun.until(1000, () -> held);
        if (mode == MANY) return CheckRun.until(1000, () -> rings >= 3);
        return CheckRun.until(1000, () -> rings >= 1 && asleep(ringer));
    }
    static boolean asleep(Thread t) {
        if (t.getState() != Thread.State.TIMED_WAITING) return false;
        for (StackTraceElement e : t.getStackTrace()) if (e.getClassName().equals("java.lang.Thread") && e.getMethodName().startsWith("sleep")) return true;
        return false;
    }
    synchronized boolean onlyOn(Thread t) { return on.isEmpty() || (on.size() == 1 && on.contains(t)); }
}`

const MODES = [
  { mode: 'HOLD', every: 60000, name: 'stop ends the ringer while it is ringing', when: 'while it rings' },
  { mode: 'SLEEP', every: 60000, name: 'stop ends the ringer while it is asleep', when: 'while it sleeps' },
  { mode: 'MANY', every: 1, name: 'the ringer rings again and again until stop', when: 'after a few rings' }
]

function ringerCase({ mode, every, name, when }) {
  return {
    name,
    mode,
    code: [
      `CheckBell bell = new CheckBell(CheckBell.${mode});`,
      'Thread got = null; Throwable thrown = null; String stuck = null; String stopStuck = null; boolean ready = false, stopped = false;',
      `try { got = CheckRun.call(1200, () -> Ringer.start(bell, ${every}L)); } catch (CheckStuck x$) { stuck = x$.what; } catch (Throwable x$) { thrown = x$; }`,
      'final Thread ringer = got;',
      'if (ringer != null && stuck == null && thrown == null) { ready = bell.ready(ringer); try { CheckRun.call(1500, () -> { bell.stopping = true; Ringer.stop(ringer); return null; }); stopped = true; } catch (CheckStuck x$) { stopStuck = x$.what; } catch (Throwable x$) { thrown = x$; } }'
    ],
    reads: {
      thrown: 'thrown == null ? null : thrown.getClass().getName()',
      'thrown.message': 'thrown == null ? null : thrown.getMessage()',
      'thrown.frames': 'thrown == null ? null : java.util.Arrays.toString(thrown.getStackTrace())',
      'thrown.cause': 'thrown == null || thrown.getCause() == null ? null : thrown.getCause().getClass().getName()',
      'thrown.cause.message': 'thrown == null || thrown.getCause() == null ? null : thrown.getCause().getMessage()',
      'thrown.cause.frames': 'thrown == null || thrown.getCause() == null ? null : java.util.Arrays.toString(thrown.getCause().getStackTrace())',
      'start still waiting': 'stuck',
      'stop still waiting': 'stopStuck',
      'given back': 'ringer == null ? "null" : ringer.getState() == Thread.State.NEW ? "a thread never started" : "a thread"',
      'ready to stop': 'ready',
      'rings before stop': 'bell.rings',
      'rang on the calling thread': 'bell.onCaller',
      'rang only on the thread given back': 'ringer == null || bell.onlyOn(ringer)',
      'stop returned while the bell was still ringing': 'bell.stopLeftEarly',
      'rings after stop was called': 'bell.afterStop',
      'ringer ended': `ringer != null && stopped && ${mode === 'SLEEP' ? 'CheckRun.until(500, () -> !ringer.isAlive())' : '!ringer.isAlive()'}`,
      'threads left running': 'stuck != null || stopStuck != null ? null : CheckRun.settle(400)'
    },
    show: `Bell bell = Check's bell;\nThread ringer = Ringer.start(bell, ${every});\n// Check waits ${when === 'after a few rings' ? 'for a few rings' : `until the ringer is ${when === 'while it rings' ? 'ringing' : 'asleep'}`}, then:\nRinger.stop(ringer);`,
    when
  }
}

// Whether stop, as written, interrupts the ringer before it waits for it. A stop that never asks
// leaves the ringer ringing too, and that is not a lost interrupt.
function asksFirst(section) {
  const at = section.search(/\bvoid\s+stop\s*\(/)
  if (at < 0) return true
  const body = section.slice(at)
  const ask = body.search(/\.interrupt\s*\(\s*\)/)
  const wait = body.search(/\.join\s*\(/)
  return ask >= 0 && (wait < 0 || ask < wait)
}

const SHOWN = ['given back', 'rings before stop', 'rings after stop was called', 'ringer ended']

function ringerJudge(runs, ctx) {
  return runs.map((r) => {
    const c = r.case
    const v = (n) => value(r, n)
    const said = quiet({ output: outcome(r, 'BusyHut', SHOWN, ctx.text.split('\n').length) }).output
    const no = (message) => fail(c.name, message, said)
    const thrown = v('thrown')
    if (v('start still waiting')) {
      return no(
        v('rang on the calling thread') === 'true'
          ? 'start rang the bell on the thread that called it, then slept there, so it never gave the ringer back. The ringing belongs on a new thread: run() does the work right where it is called, and the lesson shows what makes a thread do it on its own.'
          : `start did not return within a second. When Check stopped waiting it found ${threadWords(v('start still waiting'), FILE)}. start makes the ringer and gives it back at once; the ringing goes on in the ringer.`
      )
    }
    if (v('given back') === 'null' && !thrown) return no('start gives back null. It gives back the thread that rings the bell, so whoever closes the hut can stop it.')
    if (v('given back') === 'a thread never started') return no('start gives back a thread that was never started, so the bell never rang. A new Thread does nothing until it is started.')
    if (v('rang on the calling thread') === 'true') return no('The bell rang on the thread that called start, not on the ringer. run() does the work right where it is called; the lesson shows what makes a thread do it on its own.')
    if (v('rang only on the thread given back') === 'false') return no('The bell rang on another thread than the one start gave back, so stopping that one does not stop the bell. start gives back the very thread that rings.')
    if (thrown && thrown !== 'CheckStuck') {
      const name = thrown.split('.').pop()
      const frames = (v('thrown.frames') ?? '[]').slice(1, -1).split(', ').filter(Boolean)
      const why = explainThread({ type: thrown, message: v('thrown.message'), frames })
      return no(`${name === 'UnsupportedOperationException' ? 'stop' : 'The ringer'} threw ${/^[AEIOU]/.test(name) ? 'an' : 'a'} ${name}.${why ? ` ${why}` : ''} Read the stack trace below from the top.`)
    }
    if (v('ready to stop') === 'false') {
      if (c.mode === 'MANY') return no('The bell rang only once or twice, and then the ringer stopped by itself. It rings, sleeps, and rings again, for as long as the hut is open: until the thread is interrupted.')
      if (c.mode === 'SLEEP') return no('The ringer never went to sleep between rings. It sleeps everyMillis milliseconds after each ring, with the sleep the lesson shows.')
      return no('The bell never rang. The ringer rings first, then sleeps.')
    }
    if (v('stop still waiting') && !asksFirst(ctx.section))
      return no(`stop did not return within a second and a half. When Check stopped waiting it found ${threadWords(v('stop still waiting'), FILE)}. stop interrupts the ringer first, so that it ends, and only then waits for it.`)
    if (Number(v('rings after stop was called')) > 0)
      return no(`The bell rang again after stop had interrupted the ringer ${c.when}: the interrupt did not end it, and the ringer went on as if nothing had happened. An InterruptedException is how a sleeping thread hears it, and only a catch that ends the loop ends the ringer: a catch inside the loop, empty or not, lets it ring on.`)
    if (v('stop still waiting'))
      return no(`stop did not return within a second and a half. When Check stopped waiting it found ${threadWords(v('stop still waiting'), FILE)}. stop interrupts the ringer first, so that it ends, and only then waits for it.`)
    if (v('stop returned while the bell was still ringing') === 'true')
      return no('stop returned while the ringer was still ringing, so the hut could close with the bell still going. stop interrupts the ringer and then waits for it to end.')
    if (v('ringer ended') === 'false')
      return no(`stop returned, and the ringer was still alive afterwards. stop interrupts the ringer ${c.when}, and the ringer ends when it is interrupted, whether it is sleeping or ringing.`)
    if (v('threads left running'))
      return no(`The ringer ended, and something else start or stop made was still alive afterwards: ${threadWords(v('threads left running'), FILE)}.`)
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
    announce: {
      task: 1,
      stub: `${CHECK_THREADS}\n${SPEAKER}`,
      cases: ANNOUNCEMENTS.map((lines) =>
        threaded({
          name: lines.length ? `announce reads ${lines.length} line${lines.length > 1 ? 's' : ''} on a thread of its own` : 'announce with no lines still gives back a started thread',
          setup: ['CheckSpeaker speaker = new CheckSpeaker();', `java.util.List<String> lines = new java.util.ArrayList<>(java.util.List.of(${lines.map(text).join(', ')}));`],
          call: 'Announcer.announce(lines, speaker)',
          type: 'Thread',
          show: `Speaker speaker = Check's speaker;\nThread got = Announcer.announce(List.of(${lines.map(text).join(', ')}), speaker);`,
          after: {
            'lines said': 'speaker.said()',
            'said on the calling thread': 'speaker.onCaller',
            'announce waited for the lines': 'speaker.waited',
            'said only on the thread given back': 'got == null || speaker.onlyOn(got)',
            'the thread given back was started': 'got != null && got.getState() != Thread.State.NEW'
          },
          expected: {
            'lines said': lines,
            'said on the calling thread': false,
            'announce waited for the lines': false,
            'said only on the thread given back': true,
            'the thread given back was started': true
          },
          hint: 'announce should give back, at once, a started thread that hands each line to the speaker, in order.'
        })
      ),
      judge: judge(
        [
          {
            when: (r) => value(r, 'got') === null,
            hint: 'announce gives back null. It gives back the thread that reads the lines, so whoever needs to can wait for it.'
          },
          {
            when: (r) => value(r, 'said on the calling thread') === 'true',
            hint: 'The lines were said on the thread that called announce, before it gave anything back: no second thread read them. run() does the work right where it is called, like any method; the lesson shows what makes a thread do it on its own.'
          },
          {
            when: (r) => value(r, 'the thread given back was started') === 'false',
            hint: 'The thread announce gives back was never started, so no line was said. A new Thread does nothing until it is started.'
          },
          {
            when: (r) => value(r, 'announce waited for the lines') === 'true',
            hint: 'announce waited for the lines to be said before it gave the thread back, so the hut was stuck while the speaker read. announce gives the thread back at once: waiting for it is up to whoever needs it finished.'
          },
          {
            when: (r) => value(r, 'said only on the thread given back') === 'false',
            hint: 'The lines were said on another thread than the one announce gave back, or on more than one, and two threads have no promised order. One thread reads every line, in order, and announce gives that thread back.'
          },
          {
            when: (r) => (items(r, 'lines said') ?? []).length === 0 && r.case.expected['lines said'].length > 0,
            hint: 'No line was said. The thread hands each line to speaker.say.'
          }
        ],
        { calls: 'announce' }
      )
    },

    total: {
      task: 2,
      stub: `${CHECK_THREADS}\n${MANIFESTS}`,
      cases: [
        ...COUNTS.map((counts, i) =>
        threaded({
          name: counts.length ? `total counts ${counts.length} manifest${counts.length > 1 ? 's' : ''} at once` : 'total of no manifests is 0',
          setup: [
            'CheckGate gate = new CheckGate();',
            'CheckRun.watch = gate::watch;',
            `java.util.List<Manifest> manifests = new java.util.ArrayList<>(java.util.List.of(${counts.map((n) => `new CheckManifest(gate, ${n})`).join(', ')}));`,
            ...(i === 0 ? ['Runnable probe$ = () -> { try { Counting.total(null); } catch (InterruptedException e$) { } };'] : [])
          ],
          call: 'Counting.total(manifests)',
          type: 'int',
          wait: 2000,
          show: `int got = Counting.total(List.of(${counts.map((n) => `a manifest of ${n}`).join(', ')}));`,
          after: {
            'calls of count()': 'gate.calls',
            'counted on the calling thread': 'gate.onCaller',
            'threads started when total first waited': 'gate.workers',
            'gave back before the threads ended': 'gate.early && gate.calls > 0',
            'Check let a count go after waiting': 'gate.letGo'
          },
          expected: {
            got: counts.reduce((a, b) => a + b, 0),
            'calls of count()': counts.length,
            'counted on the calling thread': false,
            'gave back before the threads ended': false,
            ...(counts.length ? { 'threads started when total first waited': counts.length } : {})
          },
          counts,
          hint: 'total should start a thread per manifest, all before waiting for any, then wait for all of them and give back the counts added up.'
        })
        ),
        threaded({
          name: 'total lets an interrupt reach its caller',
          setup: [
            'CheckGate gate = new CheckGate();',
            'gate.interrupt = true;',
            'CheckRun.watch = gate::watch;',
            'java.util.List<Manifest> manifests = new java.util.ArrayList<>(java.util.List.of(new CheckManifest(gate, 6), new CheckManifest(gate, 9), new CheckManifest(gate, 2)));'
          ],
          call: 'Counting.total(manifests)',
          type: 'int',
          wait: 2000,
          show: '// Check interrupts the thread that called total while it waits for its threads:\nint got = Counting.total(List.of(a manifest of 6, a manifest of 9, a manifest of 2));',
          after: { 'interrupted while it waited': 'gate.interrupted' },
          throws: 'InterruptedException',
          expected: {},
          counts: [6, 9, 2],
          kind: 'interrupt',
          hint: 'Interrupted while it waits for its threads, total lets the InterruptedException reach whoever called it, as its throws clause says.'
        })
      ],
      judge: judge(
        [
          {
            when: (r) => r.case.kind === 'interrupt' && value(r, 'interrupted while it waited') === 'false',
            hint: 'total never waited for its threads the way the lesson shows, so there was no wait for Check to interrupt.'
          },
          {
            when: (r) => r.case.kind === 'interrupt' && !value(r, 'thrown'),
            hint: 'Check interrupted total while it waited for its threads, and total went on as if nothing had happened. An InterruptedException means someone asked this thread to stop: a catch that does nothing with it hides that. total says throws InterruptedException, and lets it reach whoever called it.'
          },
          {
            when: (r) => value(r, 'counted on the calling thread') === 'true',
            hint: 'A manifest was counted on the thread that called total: no second thread counted it. A thread does the work on its own only once it is started; run() does it right where it is called, like any method.'
          },
          {
            when: (r) => value(r, 'gave back before the threads ended') === 'true',
            hint: 'total gave back its answer while the counting threads were still at work, so their counts were not in yet. Before reading what a thread made, wait for that thread to end.'
          },
          {
            when: (r) => r.case.counts.length > 1 && Number(value(r, 'threads started when total first waited')) > 0 && Number(value(r, 'threads started when total first waited')) < r.case.counts.length,
            hint: (r) => `When total first waited, only ${value(r, 'threads started when total first waited')} of the ${r.case.counts.length} threads had been started, so the boats were counted one after another, as with no threads at all. Start every thread first; wait for them after.`
          },
          {
            when: (r) => r.case.counts.length > 1 && Number(value(r, 'got')) < r.case.expected.got && Number(value(r, 'calls of count()')) === r.case.counts.length,
            hint: 'Every manifest was counted, and some counts are missing from the answer: the threads put their counts into one place they share, and a thread that adds to it reads what is there before its own count is in. Two threads changing one value is the next issue. Here, give each thread a place of its own, and add them up once every thread has ended.'
          },
          {
            when: (r) => value(r, 'Check let a count go after waiting') === 'true',
            hint: 'total never waited for its threads the way the lesson shows, so Check let the counts go after a second. Wait for each thread to end with the method the lesson shows.'
          },
          {
            when: (r) => Number(value(r, 'calls of count()')) !== r.case.counts.length,
            hint: (r) => `count() was called ${value(r, 'calls of count()')} times for ${r.case.counts.length} manifest${r.case.counts.length > 1 ? 's' : ''}. Each manifest is counted once, by its own thread.`
          }
        ],
        { calls: 'total' }
      )
    },

    ringer: {
      task: 3,
      stub: `${CHECK_THREADS}\n${BELL}`,
      cases: [
        ...MODES.map(ringerCase),
        {
          name: 'stop lets the caller know it was interrupted',
          code: ['Runnable probe$ = () -> { try { Ringer.stop(null); } catch (InterruptedException e$) { } };'],
          reads: {},
          show: '',
          probe: true
        }
      ],
      judge: (runs, ctx) => ringerJudge(runs.filter((r) => !r.case.probe), ctx)
    }
  }
})
