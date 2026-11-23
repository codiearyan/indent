import { CHECK_THREADS, explainThread, fail, outcomeCases, tasks, threaded, threadWords } from '../../grading.mjs'

const FILE = 'HarbourCheck.java'
const value = (r, name) => r.values[name]?.value ?? null
const items = (r, name) => r.values[name]?.items ?? null
const text = (s) => JSON.stringify(s)

// Check's own reader, in place of the one the starter gives: it reads no disk. Each case says what
// each till file holds (sailings, or what reading it throws) and Check counts the reads. With
// hold, a read waits until the thread that handed out the jobs is waiting for their answers, or
// has returned, and Check counts the threads alive besides it at that moment, as in the executor
// issue: a pool of three always shows three, files read one after another always show one.
const TILLS = `class Sailings {
    static CheckTills tills;
    static java.util.List<Sailing> read(java.nio.file.Path file) throws java.io.IOException { return tills.read(file); }
}
final class CheckTills {
    private final java.util.Map<String, Object> files = new java.util.HashMap<>();
    private final java.util.Set<Thread> ran = new java.util.HashSet<>();
    private final boolean hold;
    private int reads;
    int workers = -1;
    volatile boolean open, early, onCaller, letGo;
    CheckTills(boolean hold) { this.hold = hold; if (!hold) open = true; Sailings.tills = this; }
    CheckTills file(String name, String... takings) {
        java.util.List<Sailing> s = new java.util.ArrayList<>();
        for (String t : takings) s.add(new Sailing(java.time.LocalDate.of(2031, 7, 9), name, 3, new java.math.BigDecimal(t)));
        files.put(name, s);
        return this;
    }
    CheckTills bad(String name, Exception e) { files.put(name, e); return this; }
    synchronized int reads() { return reads; }
    synchronized int threads() { return ran.size(); }
    java.util.List<Sailing> read(java.nio.file.Path file) throws java.io.IOException {
        Thread me = Thread.currentThread();
        synchronized (this) { reads++; ran.add(me); if (me == CheckRun.caller) onCaller = true; }
        if (hold && me != CheckRun.caller && !CheckRun.until(1000, () -> open)) letGo = true;
        Object f = files.get(file.getFileName().toString());
        if (f == null) throw new java.nio.file.NoSuchFileException(file.toString());
        if (f instanceof java.io.IOException e) throw e;
        if (f instanceof RuntimeException e) throw e;
        @SuppressWarnings("unchecked") java.util.List<Sailing> s = (java.util.List<Sailing>) f;
        return new java.util.ArrayList<>(s);
    }
    synchronized void watch() {
        Thread c = CheckRun.caller;
        if (open) return;
        if (!c.isAlive()) { early = true; open = true; return; }
        if (CheckRun.waiting(c)) { workers = CheckRun.others(c).size(); open = true; }
    }
    // Calls a job on a thread of Check's own: what it gave back, or what it threw.
    static Object run(java.util.concurrent.Callable<java.math.BigDecimal> job) {
        if (job == null) return null;
        try { return CheckRun.call(1000, job); } catch (Throwable x) { return x; }
    }
}`

// A future that has no answer yet: it gets one once the thread gathering the answers is waiting.
const LATE = `final class CheckLate extends java.util.concurrent.CompletableFuture<java.math.BigDecimal> {
    private final java.math.BigDecimal answer;
    CheckLate(String answer) { this.answer = new java.math.BigDecimal(answer); }
    void watch() { if (!isDone() && (CheckRun.waiting(CheckRun.caller) || !CheckRun.caller.isAlive())) complete(answer); }
}`

// Check's own right Jobs and Results, so Task 3 passes or fails on its own lines alone.
const RIGHT = `class Jobs {
    static java.util.concurrent.Callable<java.math.BigDecimal> takings(java.nio.file.Path file) {
        return () -> {
            java.math.BigDecimal total = java.math.BigDecimal.ZERO;
            for (Sailing s : Sailings.read(file)) total = total.add(s.takings());
            return total;
        };
    }
}
class Results {
    static java.math.BigDecimal collect(java.util.Map<String, java.util.concurrent.Future<java.math.BigDecimal>> answers, java.util.List<String> problems) throws InterruptedException {
        java.math.BigDecimal total = java.math.BigDecimal.ZERO;
        for (java.util.Map.Entry<String, java.util.concurrent.Future<java.math.BigDecimal>> a : answers.entrySet()) {
            try { total = total.add(a.getValue().get()); }
            catch (java.util.concurrent.ExecutionException e) { problems.add(a.getKey() + ": " + e.getCause().getMessage()); }
        }
        return total;
    }
}`

const quiet = (d) => (d.output ? { ...d, output: d.output.replace(/\n {2}(?:still waiting|threads left running) is null(?=\n)/g, '').replace(/It gave back [\w.$]+\$\$Lambda[^\n]*/g, 'It gave back a job.') } : d)

function judge(mistakes, { calls }) {
  return (runs, ctx) => {
    const last = ctx.text.split('\n').length
    return outcomeCases({ file: FILE, explain: explainThread })(runs, ctx).map((d, i) => {
      const r = runs[i]
      const stuck = value(r, 'still waiting')
      if (stuck) return quiet(fail(d.name, `Check waited for ${calls} to return, and it did not. When Check stopped waiting there was ${threadWords(stuck, FILE, last)}.`, d.output))
      const left = value(r, 'threads left running')
      const m = d.passed && !left ? null : mistakes.find((k) => k.when(r, ctx))
      if (m) return quiet({ ...d, passed: false, message: typeof m.hint === 'function' ? m.hint(r) : m.hint })
      if (left) return quiet(fail(d.name, `${d.passed ? 'The answer is right, and when' : 'When'} ${calls} returned it left behind ${threadWords(left, FILE, last)}. Those threads wait for jobs for ever, and in a program of their own they keep it from ending.`, d.output))
      return quiet(d)
    })
  }
}

// Each till: its name, and the takings of its sailings, or what reading it throws.
const job = ({ name, file, takings = [], bad, want, kind, throws: jobThrows }) => {
  const c = threaded({
    name,
    setup: [`CheckTills tills = new CheckTills(false)${bad ? `.bad(${text(file)}, ${bad})` : `.file(${text(file)}${takings.map((t) => `, ${text(t)}`).join('')})`};`],
    call: `Jobs.takings(java.nio.file.Path.of("closing", ${text(file)}))`,
    type: 'java.util.concurrent.Callable<java.math.BigDecimal>',
    show: `// closing/${file} ${bad ? `cannot be read: reading it throws ${bad.replace(/^new ([\w.]+)\((.*)\)$/, (m, n, a) => `${n.split('.').pop()}(${a})`)}` : `holds sailings with takings ${takings.join(', ') || '(none)'}`}\nCallable<BigDecimal> job = Jobs.takings(Path.of("closing", ${text(file)}));\n// Check notes the reads so far, then:\njob.call();`,
    after: {
      'files read when the job was made': 'made',
      'calling the job gave back': 'called instanceof java.math.BigDecimal b ? b.toPlainString() : null',
      'calling the job threw': 'called instanceof Throwable t ? t.getClass().getSimpleName() + ": " + t.getMessage() : null',
      ...(want ? { 'the right amount': `called instanceof java.math.BigDecimal b && b.compareTo(new java.math.BigDecimal(${text(want)})) == 0` } : {})
    },
    expected: { 'files read when the job was made': 0, ...(want ? { 'the right amount': true } : {}) },
    kind,
    hint: kind === 'good' ? 'Called, the job should give back the takings of the file\'s sailings added up.' : 'Called, the job should let what reading throws reach whoever called it.'
  })
  c.code.push('int made = tills.reads(); Object called = CheckTills.run(got);')
  return { ...c, file, bad, want, jobThrows }
}

const LINE_BAD = 'new IllegalArgumentException("Line 4 cannot be read")'

const DAYS = [
  {
    name: 'day reads five tills at once with three threads, one of them bad',
    files: [['dipper.csv', ['12.30', '0.10', '0.20']], ['siskin.csv', ['7.85']], ['breac.csv', LINE_BAD], ['ure.csv', ['30.15', '46.90']], ['oag.csv', []]],
    total: '97.50',
    problems: ['breac.csv: Line 4 cannot be read']
  },
  { name: 'day of two tills', files: [['dipper.csv', ['3.35']], ['siskin.csv', ['20.10', '0.05']]], total: '23.50', problems: [] },
  { name: 'day of no tills', files: [], total: '0', problems: [] }
]

export const checks = tasks({
  file: FILE,
  objects: true,
  families: true,
  exceptions: true,
  collections: true,
  functions: true,
  values: true,
  tasks: {
    jobs: {
      task: 1,
      stub: `${CHECK_THREADS}\n${TILLS}`,
      cases: [
        job({ name: 'the job reads nothing until it is called, then adds up the till', file: 'dipper.csv', takings: ['0.10', '0.20', '12.30'], want: '12.60', kind: 'good' }),
        job({ name: 'the job of a till with no sailings gives back 0', file: 'oag.csv', takings: [], want: '0', kind: 'good' }),
        job({ name: 'the job lets a line that cannot be read reach its caller', file: 'breac.csv', bad: LINE_BAD, kind: 'bad', throws: 'IllegalArgumentException' }),
        job({ name: 'the job lets a till that is not there reach its caller', file: 'gone.csv', bad: 'new java.nio.file.NoSuchFileException("closing/gone.csv")', kind: 'bad', throws: 'NoSuchFileException' })
      ],
      judge: (runs, ctx) =>
        judge(
          [
            {
              when: (r) => Number(value(r, 'files read when the job was made')) > 0,
              hint: 'takings read the file while it made the job, so the reading is done before any pool could run it, on the thread that made the job. The job does the reading when it is called: everything that reads goes inside it.'
            },
            {
              when: (r) => r.case.kind === 'bad' && value(r, 'calling the job gave back') !== null,
              hint: 'Called, the job gave back an amount for a till that cannot be read. The task lets what reading throws reach whoever called the job: whoever gathers the answers reports the till.'
            },
            {
              when: (r) => r.case.kind === 'good' && /\.\d{5,}/.test(value(r, 'calling the job gave back') ?? ''),
              hint: 'The total ends in a long tail of decimal places: the takings went through a double on their way. Keep them in BigDecimal, as the money issue did.'
            },
            {
              when: (r) => r.case.kind === 'good' && /^NoSuchFileException/.test(value(r, 'calling the job threw') ?? ''),
              hint: 'Called, the job read the file some other way than Sailings.read, and found no file there. The task reads each till with Sailings.read, the reader the starter gives, and Check hands over tills of its own through it.'
            },
            {
              when: (r) => r.case.kind === 'good' && value(r, 'calling the job threw'),
              hint: (r) => `Called, the job threw ${value(r, 'calling the job threw')}, for a till that reads well.`
            }
          ],
          { calls: 'takings' }
        )(runs, ctx).map((d, i) => {
          const r = runs[i]
          if (!d.passed || r.case.kind !== 'bad') return d
          const threw = value(r, 'calling the job threw') ?? ''
          return threw.startsWith(`${r.case.jobThrows}:`) ? d : quiet(fail(d.name, `Called, the job should let the ${r.case.jobThrows} that reading throws reach whoever called it, as it came. It threw ${threw || 'nothing'}.`, d.output))
        })
    },

    results: {
      task: 2,
      stub: `${CHECK_THREADS}\n${LATE}`,
      cases: [
        threaded({
          name: 'collect adds up the answers and notes the till that failed',
          setup: [
            'java.util.Map<String, Future<java.math.BigDecimal>> answers = new java.util.LinkedHashMap<>();',
            'answers.put("dipper.csv", CompletableFuture.completedFuture(new java.math.BigDecimal("12.40")));',
            'answers.put("siskin.csv", CompletableFuture.failedFuture(new java.io.IOException("the till went quiet")));',
            'answers.put("breac.csv", CompletableFuture.completedFuture(new java.math.BigDecimal("7.85")));',
            'java.util.List<String> problems = new java.util.ArrayList<>();',
            'Runnable probe$ = () -> { try { Results.collect(null, null); } catch (InterruptedException e$) { } };'
          ],
          call: 'Results.collect(answers, problems)',
          type: 'java.math.BigDecimal',
          show: 'Map<String, Future<BigDecimal>> answers: dipper.csv gives 12.40, siskin.csv\'s job threw IOException("the till went quiet"), breac.csv gives 7.85;\nList<String> problems = new ArrayList<>();\nBigDecimal got = Results.collect(answers, problems);',
          after: { 'the right amount': 'got != null && got.compareTo(new java.math.BigDecimal("20.25")) == 0', 'problems afterwards': 'problems' },
          expected: { 'the right amount': true, 'problems afterwards': ['siskin.csv: the till went quiet'] },
          kind: 'one',
          hint: 'collect should add up the answers of the futures that worked, and add a problem for each one whose job threw: its name, a colon and a space, and the message of what the job threw.'
        }),
        threaded({
          name: 'collect waits for an answer that is not in yet',
          setup: [
            'CheckLate late = new CheckLate("30.15");',
            'CheckRun.watch = late::watch;',
            'java.util.Map<String, Future<java.math.BigDecimal>> answers = new java.util.LinkedHashMap<>();',
            'answers.put("ure.csv", late);',
            'answers.put("oag.csv", CompletableFuture.completedFuture(new java.math.BigDecimal("0.85")));',
            'java.util.List<String> problems = new java.util.ArrayList<>();'
          ],
          call: 'Results.collect(answers, problems)',
          type: 'java.math.BigDecimal',
          show: 'Map<String, Future<BigDecimal>> answers: ure.csv\'s job still running (it gives 30.15 once collect waits for it), oag.csv gives 0.85;\nList<String> problems = new ArrayList<>();\nBigDecimal got = Results.collect(answers, problems);',
          after: { 'the right amount': 'got != null && got.compareTo(new java.math.BigDecimal("31.00")) == 0', 'problems afterwards': 'problems' },
          expected: { 'the right amount': true, 'problems afterwards': [] },
          kind: 'late',
          hint: 'collect should wait for every future, the ones not done yet too.'
        }),
        threaded({
          name: 'collect when every till failed',
          setup: [
            'java.util.Map<String, Future<java.math.BigDecimal>> answers = new java.util.LinkedHashMap<>();',
            'answers.put("breac.csv", CompletableFuture.failedFuture(new IllegalArgumentException("Line 4 cannot be read")));',
            'answers.put("gone.csv", CompletableFuture.failedFuture(new java.io.IOException("no till file")));',
            'java.util.List<String> problems = new java.util.ArrayList<>();'
          ],
          call: 'Results.collect(answers, problems)',
          type: 'java.math.BigDecimal',
          show: 'Map<String, Future<BigDecimal>> answers: breac.csv\'s job threw IllegalArgumentException("Line 4 cannot be read"), gone.csv\'s job threw IOException("no till file");\nList<String> problems = new ArrayList<>();\nBigDecimal got = Results.collect(answers, problems);',
          after: { 'the right amount': 'got != null && got.signum() == 0', 'problems afterwards': 'problems' },
          expected: { 'the right amount': true },
          problems: ['breac.csv: Line 4 cannot be read', 'gone.csv: no till file'],
          kind: 'all',
          hint: 'With every job failed, collect gives back 0 and a problem for each.'
        }),
        threaded({
          name: 'collect of no answers',
          setup: ['java.util.List<String> problems = new java.util.ArrayList<>();'],
          call: 'Results.collect(new java.util.LinkedHashMap<>(), problems)',
          type: 'java.math.BigDecimal',
          show: 'List<String> problems = new ArrayList<>();\nBigDecimal got = Results.collect(new LinkedHashMap<>(), problems);',
          after: { 'the right amount': 'got != null && got.signum() == 0', 'problems afterwards': 'problems' },
          expected: { 'the right amount': true, 'problems afterwards': [] },
          kind: 'none',
          hint: 'With no answers, collect gives back 0.'
        })
      ],
      judge: (runs, ctx) =>
        judge(
          [
            {
              when: (r) => r.case.kind !== 'none' && r.case.kind !== 'late' && (items(r, 'problems afterwards') ?? []).length === 0 && !value(r, 'thrown'),
              hint: 'A job failed, and problems stays empty: the ExecutionException was caught and dropped. Each failed till goes into problems, so whoever reads the report knows which till to look at.'
            },
            {
              when: (r) => (items(r, 'problems afterwards') ?? []).some((p) => /Exception/.test(p)),
              hint: 'A problem holds the name of an exception class. The ExecutionException\'s own message is the name and message of what the job threw; the task wants only the job\'s message, and what the job threw is the ExecutionException\'s cause.'
            },
            {
              when: (r, ctx) => /\bnew\s+Thread\b|\.start\s*\(/.test(ctx.section) && value(r, 'the right amount') === 'false',
              hint: 'The total is short: several threads add to one total, and a thread that adds reads the total before its own amount is in, so another thread\'s amount is overwritten. A BigDecimal never changes: each add gives back a new one. collect gathers the answers on its own thread, one after another; the jobs ran at once already.'
            },
            {
              when: (r) => r.case.kind === 'late' && value(r, 'the right amount') === 'false',
              hint: 'A till whose job was still running was left out of the total. collect waits for every future: get waits for a job that is not done yet.'
            },
            {
              when: (r) => r.case.kind === 'one' && value(r, 'the right amount') === 'false' && (items(r, 'problems afterwards') ?? []).length === 1,
              hint: 'The failed till is in problems, and the answers after it were not added: the try is around the whole loop, so the first failure ends the loop. Put it around the one get that can fail.'
            },
            {
              when: (r) => r.case.kind === 'all' && (items(r, 'problems afterwards') ?? []).length === 1,
              hint: 'Only the first failed till is in problems, and the answers after it were not read: the try is around the whole loop, so the first failure ends the loop. Put it around the one get that can fail.'
            },
            {
              when: (r) => value(r, 'thrown') && /ExecutionException$/.test(value(r, 'thrown')),
              hint: 'An ExecutionException reached Check. collect catches it for each answer, notes the problem, and goes on with the others.'
            },
            {
              when: (r) => value(r, 'got') && /\.\d{5,}/.test(value(r, 'got')),
              hint: 'The total ends in a long tail of decimal places: the takings went through a double on their way. Keep them in BigDecimal.'
            }
          ],
          { calls: 'collect' }
        )(runs, ctx).map((d, i) => {
          const r = runs[i]
          if (!d.passed || !r.case.problems) return d
          const got = [...(items(r, 'problems afterwards') ?? [])].sort()
          return JSON.stringify(got) === JSON.stringify(r.case.problems) ? d : quiet(fail(d.name, r.case.hint, d.output))
        })
    },

    day: {
      task: 3,
      stub: `${CHECK_THREADS}\n${TILLS}\n${RIGHT}`,
      cases: DAYS.map((day, i) =>
        threaded({
          name: day.name,
          setup: [
            `CheckTills tills = new CheckTills(true)${day.files.map(([n, t]) => (typeof t === 'string' ? `.bad(${text(n)}, ${t})` : `.file(${text(n)}${t.map((x) => `, ${text(x)}`).join('')})`)).join('')};`,
            'CheckRun.watch = tills::watch;',
            'java.util.List<String> problems = new java.util.ArrayList<>();',
            ...(i === 0 ? ['Runnable probe$ = () -> { try { Closing.day(null, null); } catch (InterruptedException e$) { } };'] : [])
          ],
          call: `Closing.day(new java.util.ArrayList<>(java.util.List.of(${day.files.map(([n]) => `java.nio.file.Path.of("closing", ${text(n)})`).join(', ')})), problems)`,
          type: 'java.math.BigDecimal',
          show: `${day.files.map(([n, t]) => `// closing/${n} ${typeof t === 'string' ? 'cannot be read: line 4 is bad' : `holds sailings with takings ${t.join(', ') || '(none)'}`}`).join('\n')}${day.files.length ? '\n' : ''}List<String> problems = new ArrayList<>();\nBigDecimal got = Closing.day(List.of(${day.files.map(([n]) => `Path.of("closing", ${text(n)})`).join(', ')}), problems);`,
          after: {
            'the right amount': `got != null && got.compareTo(new java.math.BigDecimal(${text(day.total)})) == 0`,
            'problems afterwards': 'problems',
            'tills read': 'tills.reads()',
            'threads alive when the answers were first awaited': 'tills.workers',
            'threads that read the tills': 'tills.threads()',
            'read on the calling thread': 'tills.onCaller',
            'Check let a read go after waiting': 'tills.letGo'
          },
          expected: {
            'the right amount': true,
            'problems afterwards': day.problems,
            'tills read': day.files.length,
            'read on the calling thread': false,
            'Check let a read go after waiting': false,
            ...(day.files.length ? { 'threads alive when the answers were first awaited': Math.min(3, day.files.length), 'threads that read the tills': Math.min(3, day.files.length) } : {})
          },
          size: day.files.length,
          hint: 'day should hand a pool of three threads a job per till, keep each future under the file\'s own name, and give back what Results.collect makes of them.'
        })
      ),
      judge: judge(
        [
          {
            when: (r) => value(r, 'read on the calling thread') === 'true',
            hint: 'A till was read on the thread that called day, so the tills were read one after another, with no pool. Each till\'s job is handed to the pool, and the pool\'s threads call it.'
          },
          {
            when: (r) => r.case.size > 1 && Number(value(r, 'threads that read the tills')) === 1,
            hint: 'Only one thread read the tills, so they were read one after another. The task asks for a pool of exactly three threads.'
          },
          {
            when: (r) => r.case.size > 1 && Number(value(r, 'threads alive when the answers were first awaited')) === 1,
            hint: 'When the first answer was awaited, the pool had only one job\'s thread going, so the tills were read one after another. Hand over every job first, then gather the answers.'
          },
          {
            when: (r) => Number(value(r, 'threads alive when the answers were first awaited')) > 3 || Number(value(r, 'threads that read the tills')) > 3,
            hint: (r) => `${Math.max(Number(value(r, 'threads alive when the answers were first awaited')), Number(value(r, 'threads that read the tills')))} threads read the tills, and the task allows three. A pool of a fixed size makes that many threads and no more; a new pool, or a thread, for each till makes one per till.`
          },
          {
            when: (r) => (items(r, 'problems afterwards') ?? []).some((p) => /^closing[\\/]/.test(p)),
            hint: 'The problem names the till by its whole path, closing/breac.csv. The task keeps each future under the file\'s own name, the last part of its path, as the office knows it.'
          },
          {
            when: (r) => r.case.size === 5 && value(r, 'the right amount') === 'false',
            hint: 'The total is short: the tills after the bad one were not counted, so one bad till ended the whole gathering. Results.collect from Task 2 goes on past a failed till: day hands the answers to it.'
          },
          {
            when: (r) => value(r, 'Check let a read go after waiting') === 'true',
            hint: 'day never waited for the answers the way the lesson shows, so Check let the reading go after a second.'
          },
          {
            when: (r) => Number(value(r, 'tills read')) !== r.case.size,
            hint: (r) => `${value(r, 'tills read')} reads for ${r.case.size} tills. Each till is read once, by its own job.`
          }
        ],
        { calls: 'day' }
      )
    }
  }
})
