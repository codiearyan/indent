// What the graders of this repo share. Learners write tests, so a check runs their test file
// beside the farm's working code and beside copies of it with one mistake slipped in (a
// "wrong version"). A task passes when its tests pass on the working code and fail on every
// wrong version made for that task. Tests are matched to a task by where they sit (a describe
// block) or by their name, so one task never fails because of another task's tests.
import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

function vitestBin(dir) {
  const require = createRequire(join(dir, 'noop.js'))
  return join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs')
}

/** The working code of the issue, read from its solution. */
export const workingCode = (t, target) => readFile(t.chapterPath(`solution/${target}`), 'utf8')

/** The working code with one change; throws when the change no longer applies. */
export function wrongVersion(code, [from, to]) {
  if (code.split(from).length !== 2) throw new Error(`Wrong version does not apply: ${from}`)
  return code.replace(from, to)
}

const REPORT = '.indent-tests.json'
const STEADY = '.indent-steady.mjs'

// Loaded before the runner. `clock` makes the real clock start at that time (ms since 1970) and
// `random` makes Math.random give that number, so a test that reads today's date or leaves a pick
// to chance gives the same result on every run. A fake clock or a stand-in in a test still wins.
function steadyModule({ clock, random }) {
  const lines = []
  if (clock !== undefined) {
    lines.push(`const Real = Date
const start = Real.now()
const now = () => ${clock} + (Real.now() - start)
globalThis.Date = class Date extends Real {
  constructor(...args) {
    if (args.length) super(...args)
    else super(now())
  }
  static now() {
    return now()
  }
}`)
  }
  // Only calls from the workspace get the fixed number: the runner itself needs real ones.
  if (random !== undefined) {
    lines.push(`const realRandom = Math.random
Math.random = function random() {
  const caller = new Error().stack.split('\\n')[2] ?? ''
  return /node_modules|node:/.test(caller) ? realRandom() : ${random}
}`)
  }
  return `${lines.join('\n')}\n`
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Runs the learner's test file with `code` in place of `target`.
 * Returns { tests, problem, output } where tests are { group, name, status, failure }.
 * Optional: `before` is put in front of the test file's first line (one line, so the line numbers
 * in the output stay the learner's), `args` go to the runner, `steady` pins the real clock and
 * Math.random (see steadyModule) and `only` runs one test by its group and name. The result
 * also has the `dir` it ran in.
 */
export async function runTests(t, { test, target, code, before, args = [], steady, only }) {
  const dir = await t.sandbox()
  await writeFile(join(dir, target), code)
  if (before) {
    const own = await readFile(join(dir, test), 'utf8').catch(() => undefined)
    if (own !== undefined) await writeFile(join(dir, test), `${before} ${own}`)
  }
  let env
  if (steady) {
    await writeFile(join(dir, STEADY), steadyModule(steady))
    const preload = `--import=${pathToFileURL(join(dir, STEADY)).href}`
    env = { NODE_OPTIONS: [process.env.NODE_OPTIONS, preload].filter(Boolean).join(' ') }
  }
  if (only) args = [...args, '-t', `^${escapeRegExp([...only.group, only.name].join(' > '))}$`]
  const r = await t.node(
    dir,
    [
      vitestBin(dir),
      'run',
      test,
      '--expect.requireAssertions',
      '--reporter=verbose',
      '--reporter=json',
      `--outputFile.json=${REPORT}`,
      ...args
    ],
    { timeoutMs: 40000, env }
  )
  const output = r.stdout + r.stderr
  let report
  try {
    report = JSON.parse(await readFile(join(dir, REPORT), 'utf8'))
  } catch {
    report = undefined
  }
  const file = report?.testResults?.find((f) => f.name.replaceAll('\\', '/').endsWith(test))
  if (r.timedOut) return { tests: [], problem: 'timeout', output, dir }
  if (!file) return { tests: [], problem: 'missing', output, dir }
  const tests = file.assertionResults.map((a) => ({
    group: a.ancestorTitles,
    name: a.title,
    status: a.status,
    failure: a.failureMessages?.[0]
  }))
  if (!tests.length && file.status === 'failed') {
    // The runner's own message points at line 1; Node names the line that cannot be read.
    const syntax = await t.node(dir, ['--check', test])
    const where = syntax.stderr
      .replaceAll(`${dir}/`, '')
      .replace(/\n*Node\.js v[\d.]+\s*$/, '')
    return { tests, problem: 'load', output: where || file.message || output, dir }
  }
  return { tests, output, dir }
}

/** The failure without the stack lines, short enough to read. */
export function shortFailure(failure = '') {
  return failure
    .split('\n')
    .filter((line) => !/^\s+at /.test(line))
    .join('\n')
    .trim()
    .split('\n')
    .slice(0, 8)
    .join('\n')
}

/** One detail for a test file that could not run at all, or null. */
export function fileProblem(test, run) {
  if (!run.problem) return null
  const message = {
    missing: `Check cannot find ${test}. Keep the file where it was, with the same name.`,
    timeout: `${test} did not finish in time. Look for a loop that never ends in your tests.`,
    load: `${test} stops before any test runs, at a line JavaScript cannot read. The output names that line; a missing bracket, quote or comma is the usual cause.`
  }[run.problem]
  return { name: `${test} runs`, passed: false, message, output: shortFailure(run.output) }
}

const isReal = (test) => test.status === 'passed' || test.status === 'failed'
const fullName = (test) => [...test.group, test.name].join(' > ')

/** Why a test failed on the working code, said in plain words. `explain` may say it first. */
export function whyItFails(test, { thrown, explain } = {}) {
  const own = explain?.(test)
  if (own) return own
  const first = shortFailure(test.failure).split('\n')[0]
  const numbers = first.match(
    /^AssertionError: expected (-?[\d.e+-]+) to (?:be|deeply equal) (-?[\d.e+-]+)/
  )
  if (numbers && Math.abs(Number(numbers[1]) - Number(numbers[2])) < 1e-9) {
    return `"${test.name}" compares two decimals that differ only far after the point. The lesson's part on decimals says which matcher allows for that.`
  }
  if (/serializes to the same string|no visual difference/.test(test.failure ?? '')) {
    return `"${test.name}" compares two lists or objects that look the same but are not the very same one. Use the matcher from the issue "Equal values, equal objects" that compares what is inside.`
  }
  if (/expected any number of assertion/.test(first)) {
    return `"${test.name}" has no expect in it, so it checks nothing. Add an expect that compares what the code gives with what it should give.`
  }
  if (/^AssertionError: expected undefined /.test(first)) {
    return `"${test.name}" got undefined back from the code. That usually means the function was given something it does not know: check the spelling of what you pass in, capital letters count.`
  }
  if (/to throw error including .* but got/.test(first)) {
    return `"${test.name}" looks for text that the error's message does not contain. Compare your text with the message in the output, letter by letter. If that message is about another rule, your example breaks that rule too.`
  }
  if (/expected error to be instance of/.test(first)) {
    return `"${test.name}" expects a different kind of error from the one the code threw. Run the tests in the terminal to see the error it threw: if it is about another rule, your example breaks that rule too.`
  }
  if (/to throw an error, but it didn't|expected \[Function\] to throw an error$/.test(first)) {
    return `"${test.name}" expects an error, but the code accepts what your test gave it. Check that your example really breaks the rule.`
  }
  if (/to not throw an error but/.test(first)) {
    return `"${test.name}" expects no error, but what your test gave the code breaks one of its rules. Read the error in the output.`
  }
  if (/^AssertionError/.test(first)) {
    return `"${test.name}" fails on the farm's working code, so it expects something the code does not do. Work the expected value out again from the rules in the task, and run the tests in the terminal: the Expected and Received lines show where the two differ.`
  }
  if (/is not defined|is not a function/.test(first)) {
    return `"${test.name}" stops at a name that does not exist. Check the spelling of the function and that it is imported at the top of the file.`
  }
  return (
    thrown?.(test.name) ??
    `"${test.name}" stops with an error before its expect finishes. Read the error in the output and the line it points at.`
  )
}

function list(tests) {
  return tests.length ? tests.map((x) => `  ${fullName(x)}`).join('\n') : '  (no tests)'
}

const NONE =
  'None of them fail on any wrong version. A test that never calls the function, compares it with its own answer, or uses an example where this rule makes no difference can never fail.'

const timedOut = (test) => /Test timed out in \d+ms/.test(test.failure ?? '')

const LEFTOVER = (name) =>
  `"${name}" passes when it runs alone, but fails after the tests before it. Something an earlier test changed is still there when it starts, like a fake clock or a stand-in that was never put back. Each test should set up what it needs and put back what it changes.`
const NEEDS_EARLIER = (name) =>
  `"${name}" passes after the tests before it, but fails when it runs alone. It leans on something an earlier test left behind. Give it everything it needs itself.`
/** Why a test of code that answers later fails, for the ways that go wrong most, or undefined. */
export function explainWaiting({ name, failure = '' }) {
  if (/expected Promise\{.*\} to /.test(failure)) {
    return `"${name}" compares the promise itself, not the answer it brings later. Wait for the answer with await, as the issue "Tests that wait" shows.`
  }
  if (/expected any number of assertion/.test(failure)) {
    return `"${name}" ends before any expect has run. An expect inside .then, or after a promise nobody waits for, runs too late to count. Wait with await before you expect, and if the test has no expect at all, add one.`
  }
  if (/was not awaited/.test(failure)) {
    return `"${name}" uses resolves or rejects without await in front of expect, so the test ends before the check is done. Put await in front of expect.`
  }
  return undefined
}

const NEVER_ENDS = (name, limit) =>
  `"${name}" did not finish within ${limit / 1000} seconds, so Check stopped it. It waits for something that never comes, like a promise that never settles, or for real time to pass.`
const OTHER_DAY = {
  where: 'on another day too',
  message: (name) =>
    `"${name}" gives a different result on another day. It reads the real clock, so it only passes at some times of the week. Set the date in the test, as the lesson shows.`
}

/**
 * Judges one task. `pick` says which tests are this task's, `where` says it in words for the
 * messages, and each wrong version has a `label` (what it gets wrong) and a `hint` (where to look).
 * `none` is said once when no wrong version is caught at all.
 *
 * Part 2 adds, each only when asked for: `limit` stops every test and hook after that many ms (a
 * test stopped that way never counts as catching a mistake), `steady` is two settings for
 * runTests: everything runs with the first and the working code once more with the second, and a
 * test that gives another result there fails with `unsteady` ({ where, message }). `alone` runs
 * each of the task's tests by itself, with both settings, and `explain(test)` may say why a test
 * fails before the usual messages.
 */
export async function judge(t, options) {
  const { test, target, pick, where, missing, wrong, thrown, none = NONE } = options
  const { limit, steady, unsteady = OTHER_DAY, alone, explain } = options
  const args = limit ? [`--testTimeout=${limit}`, `--hookTimeout=${limit}`] : []
  const run = (code, more) =>
    runTests(t, { test, target, code, args, steady: steady?.[0], ...more })
  const code = await workingCode(t, target)
  const versions = wrong.map((w) => wrongVersion(code, w.change))
  // Every run is awaited here, so none is still going when the sandboxes are removed.
  const [later, good, ...runs] = await Promise.all([
    steady && run(code, { steady: steady[1] }),
    ...[code, ...versions].map((c) => run(c))
  ])
  const problem = fileProblem(test, good)
  if (problem) return [problem]

  const real = good.tests.filter(isReal)
  const mine = real.filter(pick)
  if (!mine.length) {
    return [
      {
        name: `Has a test ${where}`,
        passed: false,
        message: missing ?? `Check finds no test ${where} yet. Tests anywhere else do not count for this task.`,
        output: `Tests Check found:\n${list(real)}`
      }
    ]
  }

  const broken = mine.filter((x) => x.status === 'failed')
  const why = (x) => (limit && timedOut(x) ? NEVER_ENDS(x.name, limit) : explain?.(x))
  let message = broken.length ? whyItFails(broken[0], { thrown, explain: why }) : undefined
  if (broken.length && (steady || alone)) {
    const single = alone && (await run(code, { only: broken[0] }))
    const status = (r) => r?.tests.find((x) => fullName(x) === fullName(broken[0]))?.status
    if (status(later) === 'passed') message = unsteady.message(broken[0].name)
    else if (status(single) === 'passed') message = LEFTOVER(broken[0].name)
  }
  const details = [
    {
      name: `Your tests ${where} pass on the farm's working code`,
      passed: broken.length === 0,
      message,
      output: broken.length
        ? `${fullName(broken[0])}\n${shortFailure(broken[0].failure)}`
        : `Passed:\n${list(mine)}`
    }
  ]
  // Wrong versions are judged once every test of the task passes on the working code.
  if (broken.length) return details

  if (steady) {
    const after = new Map(later.tests.map((x) => [fullName(x), x.status]))
    const moved = mine.filter((x) => after.get(fullName(x)) !== 'passed')
    details.push({
      name: `Your tests ${where} pass ${unsteady.where}`,
      passed: !moved.length,
      message: moved.length ? unsteady.message(moved[0].name) : undefined,
      output: moved.length ? `There this failed:\n${list(moved)}` : `Passed:\n${list(mine)}`
    })
    if (moved.length) return details
  }
  if (alone) {
    const settings = steady ?? [undefined]
    const singles = await Promise.all(
      mine.flatMap((x) => settings.map((s) => run(code, { only: x, steady: s })))
    )
    const passedAlone = (x, r) =>
      r.tests.find((y) => fullName(y) === fullName(x))?.status === 'passed'
    const leaning = mine.filter((x, i) =>
      settings.some((_, j) => !passedAlone(x, singles[i * settings.length + j]))
    )
    details.push({
      name: `Your tests ${where} pass when each runs alone`,
      passed: !leaning.length,
      message: leaning.length ? NEEDS_EARLIER(leaning[0].name) : undefined,
      output: leaning.length ? `Alone, this failed:\n${list(leaning)}` : `Passed:\n${list(mine)}`
    })
    if (leaning.length) return details
  }

  // A wrong version that could not be run proves nothing, so it never counts as caught.
  const stopped = runs.find((run) => run.problem)
  if (stopped) {
    return [
      ...details,
      {
        name: 'Your tests run on the wrong versions',
        passed: false,
        message: `Check could not finish running ${test} on a wrong version of the code. Run the tests in the terminal and make sure they end, then check again.`,
        output: shortFailure(stopped.output)
      }
    ]
  }
  const caughtBy = runs.map((run) => {
    const after = new Map(run.tests.map((x) => [fullName(x), x]))
    const failed = (x) => x?.status === 'failed' && !(limit && timedOut(x))
    return mine.filter((x) => failed(after.get(fullName(x))))
  })
  const stuck = runs.map((run) =>
    limit ? run.tests.filter((x) => pick(x) && x.status === 'failed' && timedOut(x)) : []
  )
  // Said once, on the first miss, when no wrong version is caught at all.
  let note = caughtBy.every((c) => c.length === 0)
  wrong.forEach((w, i) => {
    const caught = caughtBy[i]
    const extra = note ? ` ${none}` : ''
    note = false
    if (!caught.length && stuck[i].length) {
      details.push({
        name: `Fails on a version that ${w.label}`,
        passed: false,
        message: `Your tests ${where} never finish on a version that ${w.label}, so they cannot say what is wrong with it. A test should check what has happened by a time it sets, not wait for something that may never come.`,
        output: `On that version these were stopped after ${limit / 1000} seconds:\n${list(stuck[i])}`
      })
      return
    }
    details.push({
      name: `Fails on a version that ${w.label}`,
      passed: caught.length > 0,
      message: caught.length
        ? undefined
        : `Your tests ${where} still pass on a version that ${w.label}. ${w.hint}${extra}`,
      output: caught.length
        ? `Failed there, as it should:\n${list(caught)}`
        : `On that version these still passed:\n${list(mine)}`
    })
  })
  return details
}

/** The tests of a task that live in the describe block called `title`. */
export const block = (title) => ({
  pick: (test) => test.group[0] === title,
  where: `in the ${title} block`,
  missing: `Check finds no test in the ${title} block yet. It looks for describe('${title}'), spelled exactly like that, and tests anywhere else do not count for this task.`
})
