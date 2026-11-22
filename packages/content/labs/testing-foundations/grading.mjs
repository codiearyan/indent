// What the graders of this repo share. Learners write tests, so a check runs their test file
// beside the farm's working code and beside copies of it with one mistake slipped in (a
// "wrong version"). A task passes when its tests pass on the working code and fail on every
// wrong version made for that task. Tests are matched to a task by where they sit (a describe
// block) or by their name, so one task never fails because of another task's tests.
import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

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

/**
 * Runs the learner's test file with `code` in place of `target`.
 * Returns { tests, problem, output } where tests are { group, name, status, failure }.
 */
export async function runTests(t, { test, target, code }) {
  const dir = await t.sandbox()
  await writeFile(join(dir, target), code)
  const r = await t.node(
    dir,
    [
      vitestBin(dir),
      'run',
      test,
      '--expect.requireAssertions',
      '--reporter=verbose',
      '--reporter=json',
      `--outputFile.json=${REPORT}`
    ],
    { timeoutMs: 40000 }
  )
  const output = r.stdout + r.stderr
  let report
  try {
    report = JSON.parse(await readFile(join(dir, REPORT), 'utf8'))
  } catch {
    report = undefined
  }
  const file = report?.testResults?.find((f) => f.name.replaceAll('\\', '/').endsWith(test))
  if (r.timedOut) return { tests: [], problem: 'timeout', output }
  if (!file) return { tests: [], problem: 'missing', output }
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
    return { tests, problem: 'load', output: where || file.message || output }
  }
  return { tests, output }
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

/** Why a test failed on the working code, said in plain words. */
export function whyItFails(test, { thrown } = {}) {
  const first = shortFailure(test.failure).split('\n')[0]
  const numbers = first.match(/^AssertionError: expected (-?[\d.e+-]+) to be (-?[\d.e+-]+)/)
  if (numbers && Math.abs(Number(numbers[1]) - Number(numbers[2])) < 1e-9) {
    return `"${test.name}" compares two decimals that differ only far after the point. The lesson's part on decimals says which matcher allows for that.`
  }
  if (/serializes to the same string|no visual difference/.test(test.failure ?? '')) {
    return `"${test.name}" compares two lists or objects that look the same but are not the very same one. The lesson's part on lists and objects says which matcher compares what is inside.`
  }
  if (/expected any number of assertion/.test(first)) {
    return `"${test.name}" has no expect in it, so it checks nothing. Add an expect that compares what the code gives with what it should give.`
  }
  if (/^AssertionError: expected undefined /.test(first)) {
    return `"${test.name}" got undefined back from the code. That usually means the function was given something it does not know: check the spelling of what you pass in, capital letters count.`
  }
  if (/to throw error including .* but got/.test(first)) {
    return `"${test.name}" looks for text that the error's message does not contain. Compare your text with the message in the output, letter by letter.`
  }
  if (/expected error to be instance of/.test(first)) {
    return `"${test.name}" expects a different kind of error from the one the code throws. Read the rule in the code to see which kind it throws.`
  }
  if (/to throw an error, but it didn't|expected \[Function\] to throw an error$/.test(first)) {
    return `"${test.name}" expects an error, but the code accepts what your test gave it. Check that your example really breaks the rule.`
  }
  if (/to not throw an error but/.test(first)) {
    return `"${test.name}" expects no error, but what your test gave the code breaks one of its rules. Read the error in the output.`
  }
  if (/^AssertionError/.test(first)) {
    return `"${test.name}" fails on the farm's working code, so it expects something the code does not do. Work the expected value out again from the rules in the task, and read the output to see what the code gave.`
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

/**
 * Judges one task. `pick` says which tests are this task's, `where` says it in words for the
 * messages, and each wrong version has a `label` (what it gets wrong) and a `hint` (where to look).
 */
export async function judge(t, { test, target, pick, where, missing, wrong, thrown }) {
  const code = await workingCode(t, target)
  const versions = wrong.map((w) => wrongVersion(code, w.change))
  const [good, ...runs] = await Promise.all(
    [code, ...versions].map((c) => runTests(t, { test, target, code: c }))
  )
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
  const details = [
    {
      name: `Your tests ${where} pass on the farm's working code`,
      passed: broken.length === 0,
      message: broken.length ? whyItFails(broken[0], { thrown }) : undefined,
      output: broken.length
        ? `${fullName(broken[0])}\n${shortFailure(broken[0].failure)}`
        : `Passed:\n${list(mine)}`
    }
  ]
  const passing = mine.filter((x) => x.status === 'passed')
  if (!passing.length) return details

  const caughtBy = runs.map((run) => {
    const after = new Map(run.tests.map((x) => [fullName(x), x.status]))
    return mine.filter((x) => x.status === 'passed' && after.get(fullName(x)) !== 'passed')
  })
  // Said once, on the first miss, when no wrong version is caught at all.
  let note = caughtBy.every((c) => c.length === 0)
  wrong.forEach((w, i) => {
    const caught = caughtBy[i]
    const extra = note
      ? ' None of them fail on any wrong version. A test that does not call the function, or compares it with its own answer, can never fail.'
      : ''
    note = false
    details.push({
      name: `Fails on a version that ${w.label}`,
      passed: caught.length > 0,
      message: caught.length
        ? undefined
        : `Your tests ${where} still pass on a version that ${w.label}. ${w.hint}${extra}`,
      output: caught.length
        ? `Failed there, as it should:\n${list(caught)}`
        : `On that version these still passed:\n${list(passing)}`
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
