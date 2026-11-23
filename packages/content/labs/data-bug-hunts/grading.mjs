// What the checks of every issue in this repo share. Every bug here hides on some computers and
// shows on others, so learner code and learner tests both run on several "computers": a time zone
// and a language each, set with TZ, LANG and setting.mjs. Nothing here reads the real clock.
//
// runCases runs one function of the learner's on a list of cases on each computer. judgeTests
// runs the learner's test file beside the right code and beside wrong versions of it, on each
// computer, and passes when the tests of one describe block pass on the right code everywhere
// and fail on every wrong version.
import { cp, mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import { isDeepStrictEqual } from 'node:util'
import { createRequire } from 'node:module'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

const computer = (zone, locale) => ({ zone, locale, label: `${zone}, ${locale}` })

// West with clock changes, a half hour east, and as far east as clocks go.
export const SETTINGS = [
  computer('America/Vancouver', 'en-CA'),
  computer('Asia/Kolkata', 'sv-SE'),
  computer('Pacific/Kiritimati', 'de-DE')
]
// Code is cheap to run, so it also runs where the shop is and in one more zone east.
export const MORE_SETTINGS = [
  ...SETTINGS,
  computer('Europe/London', 'en-GB'),
  computer('Asia/Tokyo', 'ja-JP')
]

export const detail = (name, passed, message, output) => ({
  name,
  passed,
  message: passed ? undefined : message,
  output
})

export const show = (value) => (value === undefined ? 'undefined' : JSON.stringify(value))

const RUNNER = `import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const [file, name, casesFile, outFile] = process.argv.slice(2)
const say = (value) => writeFileSync(outFile, JSON.stringify(value))
const text = (e) => (e instanceof Error ? e.name + ': ' + e.message : String(e))
let mod
try {
  mod = await import(pathToFileURL(file).href)
} catch (e) {
  say({ load: text(e) })
  process.exit(0)
}
if (typeof mod[name] !== 'function') {
  say({ load: name + ' is not an exported function of ' + file })
  process.exit(0)
}
const results = JSON.parse(readFileSync(casesFile, 'utf8')).map((args) => {
  try {
    const value = mod[name](...args)
    return {
      ok: true,
      value: value === undefined ? null : JSON.parse(JSON.stringify(value)),
      after: JSON.parse(JSON.stringify(args))
    }
  } catch (e) {
    return { ok: false, error: text(e) }
  }
})
say({ results })
process.exit(0)
`

async function prepare(dir) {
  await mkdir(join(dir, '.grader'), { recursive: true })
  await copyFile(join(here, 'setting.mjs'), join(dir, '.grader/setting.mjs'))
  await writeFile(join(dir, '.grader/run.mjs'), RUNNER)
}

function envFor(dir, setting) {
  const lang = `${setting.locale.replace('-', '_')}.UTF-8`
  const preload = `--import=${pathToFileURL(join(dir, '.grader/setting.mjs')).href}`
  return {
    TZ: setting.zone,
    LANG: lang,
    LC_ALL: lang,
    INDENT_LOCALE: setting.locale,
    NODE_OPTIONS: [process.env.NODE_OPTIONS, preload].filter(Boolean).join(' ')
  }
}

const readOut = (file) =>
  readFile(file, 'utf8').then(JSON.parse, () => undefined)

/**
 * Runs `exportName` of the learner's `file` once per case (a list of arguments) on each computer.
 * Returns { problem } when the file does not load or never finishes, else { runs }, one list of
 * { ok, value } or { ok: false, error } per computer, in the order of `settings`.
 */
export async function runCases(t, { file, exportName, cases, settings = MORE_SETTINGS }) {
  const dir = await t.sandbox()
  await prepare(dir)
  await writeFile(join(dir, '.grader/cases.json'), JSON.stringify(cases))
  const done = await Promise.all(
    settings.map((s, k) =>
      t.node(dir, ['.grader/run.mjs', file, exportName, '.grader/cases.json', `.grader/out${k}.json`], {
        env: envFor(dir, s),
        timeoutMs: 15000
      })
    )
  )
  const stopped = done.find((r) => r.timedOut)
  if (stopped) {
    return {
      problem: detail(
        `${exportName}() finishes`,
        false,
        `${exportName}() did not finish within 15 seconds, so Check stopped it. Look for a loop that never ends.`,
        ''
      )
    }
  }
  const said = await Promise.all(settings.map((_, k) => readOut(join(dir, `.grader/out${k}.json`))))
  const broken = said.findIndex((s) => !s || s.load)
  if (broken !== -1) {
    const why = said[broken]?.load ?? (done[broken].stderr || 'It stopped without a result.')
    return {
      problem: detail(
        `${file} loads`,
        false,
        /Not implemented/.test(why)
          ? `${file} still throws 'Not implemented' as it loads.`
          : `${file} could not be loaded, so nothing in it could be tried. Read the error: it names the line.`,
        why.slice(0, 1500)
      )
    }
  }
  return { runs: said.map((s) => s.results) }
}

/**
 * One detail per case: the learner's answer must equal `right(...args)` on every computer.
 * A case is { name, args, cause } where `cause` says what to look at when it is wrong. `same`
 * compares two answers (deep equality unless given). The output shows the call and what the
 * learner's code gave, never the right answer. `partial`, when given, is said instead of the
 * case's cause when the answer is right on some computers and wrong on others.
 */
export async function checkCases(t, { file, exportName, cases, right, same, partial, settings = MORE_SETTINGS }) {
  const run = await runCases(t, { file, exportName, cases: cases.map((c) => c.args), settings })
  if (run.problem) return [run.problem]
  const equal = same ?? isDeepStrictEqual
  const call = (args) => `${exportName}(${args.map(show).join(', ')})`
  return cases.map((c, i) => {
    const expected = right(...structuredClone(c.args))
    const got = run.runs.map((results) => results[i])
    const wrongOn = settings.filter((_, k) => !(got[k].ok && equal(got[k].value, expected)))
    const threw = got.find((g) => !g.ok)
    const changed = c.keepsArgs && got.find((g) => g.ok && !isDeepStrictEqual(g.after, c.args))
    if (changed && !threw) {
      return detail(
        c.name,
        false,
        `${exportName}() changed the list it was handed. Whoever called it finds their own list in a new order. Work on a copy.`,
        `${call(c.args)}\nleft the list as ${show(changed.after[0])}`
      )
    }
    if (!wrongOn.length) return detail(c.name, true, undefined, `${call(c.args)}\ngave ${show(got[0].value)}`)
    const everywhere = wrongOn.length === settings.length
    const where = everywhere
      ? ''
      : ` It is wrong only on a computer set to ${wrongOn.map((s) => s.label).join(' or ')}, so it depends on the computer it runs on.`
    const lines = settings.map((s, k) => `${s.label}: ${got[k].ok ? show(got[k].value) : got[k].error}`)
    return detail(
      c.name,
      false,
      threw && /Not implemented/.test(threw.error)
        ? `${exportName}() still throws 'Not implemented'.`
        : threw
          ? `${exportName}() threw for this case. Read the error below.`
          : !everywhere && partial
            ? `${partial}${where}`
            : `${typeof c.cause === 'function' ? c.cause(got[settings.indexOf(wrongOn[0])].value, expected) : c.cause}${where}`,
      `${call(c.args)}\n${lines.join('\n')}`
    )
  })
}

/** One detail for many cases at once: how many came out wrong, and the first of them. */
export async function checkMany(t, { name, file, exportName, cases, right, same, cause, settings = MORE_SETTINGS }) {
  const run = await runCases(t, { file, exportName, cases, settings })
  if (run.problem) return run.problem
  const equal = same ?? isDeepStrictEqual
  const wrong = []
  cases.forEach((args, i) => {
    const expected = right(...structuredClone(args))
    const k = run.runs.findIndex((results) => !(results[i].ok && equal(results[i].value, expected)))
    if (k !== -1) wrong.push({ args, setting: settings[k], got: run.runs[k][i], expected })
  })
  const first = wrong[0]
  return detail(
    name,
    wrong.length === 0,
    `${wrong.length} of ${cases.length} came out wrong. ${typeof cause === 'function' && first ? cause(first.got.value, first.expected) : cause}`,
    first
      ? `First wrong one, on ${first.setting.label}:\n${exportName}(${first.args.map(show).join(', ')})\ngave ${first.got.ok ? show(first.got.value) : first.got.error}`
      : `All ${cases.length} right on ${settings.length} computers.`
  )
}

// ---------------------------------------------------------------- learner tests

function vitestBin(dir) {
  const require = createRequire(join(dir, 'noop.js'))
  return join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs')
}

const REPORT = '.indent-tests.json'
const skip = (workspace) => (src) => {
  const parts = relative(workspace, src).split(/[\\/]/)
  return !parts.includes('node_modules') && parts[0] !== '.indent'
}

/** Runs the test file once per version (a file of code put in place of `target`) on one computer. */
async function runVersions(t, { test, target, sources, setting }) {
  const dir = await t.sandbox()
  await prepare(dir)
  const folders = sources.map((_, i) => `__v${i}`)
  await Promise.all(
    sources.map(async (source, i) => {
      const sub = join(dir, folders[i])
      await cp(t.workspace, sub, { recursive: true, filter: skip(t.workspace) })
      await writeFile(join(sub, target), await readFile(source, 'utf8'))
    })
  )
  const r = await t.node(
    dir,
    [
      vitestBin(dir),
      'run',
      ...folders.map((f) => `${f}/${test}`),
      '--expect.requireAssertions',
      '--testTimeout=5000',
      '--reporter=json',
      `--outputFile.json=${REPORT}`,
      '--maxWorkers=2'
    ],
    { timeoutMs: 40000, env: envFor(dir, setting) }
  )
  let report
  try {
    report = JSON.parse(await readFile(join(dir, REPORT), 'utf8'))
  } catch {
    report = undefined
  }
  return folders.map((folder) => {
    if (r.timedOut) return { problem: 'timeout', output: r.stdout + r.stderr }
    const file = report?.testResults?.find((f) =>
      f.name.replaceAll('\\', '/').endsWith(`${folder}/${test}`)
    )
    if (!file) return { problem: 'missing', output: r.stdout + r.stderr }
    const tests = file.assertionResults.map((a) => ({
      group: a.ancestorTitles,
      name: a.title,
      status: a.status,
      failure: a.failureMessages?.[0] ?? ''
    }))
    if (!tests.length && file.status === 'failed') {
      return { problem: 'load', output: file.message || r.stdout + r.stderr }
    }
    return { tests }
  })
}

const short = (failure = '') =>
  failure
    .split('\n')
    .filter((line) => !/^\s+at /.test(line))
    .join('\n')
    .trim()
    .split('\n')
    .slice(0, 6)
    .join('\n')

const fullName = (x) => [...x.group, x.name].join(' > ')
const list = (tests) => (tests.length ? tests.map((x) => `  ${fullName(x)}`).join('\n') : '  (none)')
const timedOut = (x) => /Test timed out in \d+ms/.test(x.failure)

function whyItFails(x) {
  const first = short(x.failure).split('\n')[0]
  if (timedOut(x)) {
    return `"${x.name}" did not finish within 5 seconds, so Check stopped it. Look for a loop that never ends, or a wait for something that never comes.`
  }
  if (/expected any number of assertion/.test(first)) {
    return `"${x.name}" has no expect in it, so it checks nothing. Add an expect that compares what the code gives with what it should give.`
  }
  if (/Not implemented/.test(first)) {
    return `"${x.name}" still throws 'Not implemented'. Replace that line with your test.`
  }
  if (/is not defined|is not a function/.test(first)) {
    return `"${x.name}" stops at a name that does not exist. Check the spelling, and that it is imported at the top of the file.`
  }
  if (/^AssertionError/.test(first)) {
    return `"${x.name}" fails on the right code, so it expects something the task does not ask for. Work the expected value out again, by hand, from the rules in the task.`
  }
  return `"${x.name}" stops with an error before its expect finishes. Read the error and the line it points at.`
}

const PROBLEM = {
  missing: (test) => `Check cannot find ${test}. Keep the file where it was, with the same name.`,
  timeout: (test) => `${test} did not finish in time, so Check stopped it. Look for a loop that never ends in your tests, or a wait for something that never comes.`,
  load: (test) => `${test} stops before any test runs. The output names the line; a missing bracket, quote or comma is the usual cause, or an import of a name the file does not export.`
}

// The tasks of one Check run in one process, so the tasks that judge the same test file share one
// start of the test runner per computer instead of starting it once each.
const started = new Map()

/**
 * Judges the tests in describe(`block`) of `test`. They must pass beside the solution's `target`
 * on every computer, and fail beside each version in `versions` ({ label, source, hint,
 * anywhere }): on every computer, or on at least one when `anywhere` is set (for a bug that only
 * one language setting can show, since a test cannot change the computer's language). `pool`
 * lists every version any task judges this test file against, so they can all run at once.
 */
export async function judgeTests(t, { test, target, block, versions, pool = versions, settings = SETTINGS }) {
  const sources = [`solution/${target}`, ...new Set(pool.map((v) => v.source))]
  const runs = await Promise.all(
    settings.map((setting) => {
      const key = JSON.stringify([test, setting.label, sources])
      if (!started.has(key)) {
        const paths = sources.map((source) => t.chapterPath(source))
        started.set(key, runVersions(t, { test, target, sources: paths, setting }))
      }
      return started.get(key)
    })
  )
  const bySetting = runs.map((all) => [all[0], ...versions.map((v) => all[sources.indexOf(v.source)])])
  const where = `in the "${block}" block`
  const rightRuns = bySetting.map((runs) => runs[0])
  const problem = rightRuns.find((r) => r.problem)
  if (problem) return [detail(`${test} runs`, false, PROBLEM[problem.problem](test), short(problem.output))]

  const real = (r) => r.tests.filter((x) => x.status === 'passed' || x.status === 'failed')
  const mine = real(rightRuns[0]).filter((x) => x.group[0] === block)
  if (!mine.length) {
    return [
      detail(
        `Has a test ${where}`,
        false,
        `Check finds no test ${where} yet. It looks for describe('${block}'), spelled exactly like that, and tests anywhere else do not count for this task.`,
        `Tests Check found:\n${list(real(rightRuns[0]))}`
      )
    ]
  }
  const statusIn = (r, x) => r.tests?.find((y) => fullName(y) === fullName(x))
  const failingOn = (r) => mine.filter((x) => statusIn(r, x)?.status !== 'passed')

  const brokenBy = rightRuns.map(failingOn)
  const broken = brokenBy.find((b) => b.length)
  const details = []
  if (broken) {
    const x = broken[0]
    const on = settings.filter((_, k) => brokenBy[k].some((y) => fullName(y) === fullName(x)))
    const everywhere = on.length === settings.length
    const own = statusIn(rightRuns[settings.indexOf(on[0])], x)
    details.push(
      detail(
        `Your tests ${where} pass on the right code`,
        false,
        everywhere
          ? whyItFails(own)
          : `"${x.name}" passes on the right code on some computers and fails on others: it fails when the clock is set to ${on.map((s) => s.zone).join(', ')}. A test should give the same result on any computer, so set what it depends on inside the test.`,
        `${fullName(x)}\n${/^AssertionError/.test(short(own.failure)) ? 'The expected and received values are left out here, because the received one would give the answer away.' : short(own.failure)}`
      )
    )
    return details
  }
  details.push(detail(`Your tests ${where} pass on the right code`, true, undefined, `Passed:\n${list(mine)}`))

  versions.forEach((v, i) => {
    const runs = bySetting.map((r) => r[i + 1])
    const stuck = runs.find((r) => r.problem)
    if (stuck) {
      details.push(
        detail(
          `Fails on ${v.label}`,
          false,
          `Check could not finish running ${test} beside ${v.label}. Run your tests in the terminal and make sure they end.`,
          short(stuck.output)
        )
      )
      return
    }
    const caughtOn = runs.map((r) =>
      mine.filter((x) => {
        const y = statusIn(r, x)
        return y?.status === 'failed' && !timedOut(y)
      })
    )
    const on = settings.filter((_, k) => caughtOn[k].length)
    const caught = v.anywhere ? on.length > 0 : on.length === settings.length
    const message = caught
      ? undefined
      : on.length
        ? `Your tests ${where} fail on ${v.label} only when the computer's clock is set to ${on.map((s) => s.zone).join(', ')}, and pass on it everywhere else. A build computer somewhere else would never see the bug. Set the time zone inside the test with inZone, so the test shows it on any computer.`
        : `Your tests ${where} still pass on ${v.label}. ${v.hint}`
    details.push(
      detail(
        `Fails on ${v.label}`,
        caught,
        message,
        settings
          .map((s, k) => `${s.label}: ${caughtOn[k].length ? `failed, as it should:\n${list(caughtOn[k])}` : 'every test passed'}`)
          .join('\n')
      )
    )
  })
  return details
}
