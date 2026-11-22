// What the graders of "Waiting on the world" share. A learner's code here finishes later, so a
// case cannot simply call it and read the answer. Each case runs one export of the issue's
// grader/drive.mjs in its own process, with waiting-drive.mjs beside it and the check's own
// src/shop.js in place of the given one. The drive hands the learner's code slow machines and a
// clock the case settles itself, and reports what happened, in order. A case judges that report.
import { fileURLToPath } from 'node:url'
import { inspect, isDeepStrictEqual } from 'node:util'
import { code } from './grading.mjs'
import { readSource, shape } from './catalogue-grading.mjs'
import { partOf as topLevel } from './rules-grading.mjs'

export { code, readSource, shape }

/** The text of a top-level function, written with or without export and async in front. */
export const partOf = (source, name) =>
  topLevel(source.replace(/^(?:export\s+)?(?:async\s+)?(?=function\b|const\b|let\b)/gm, ''), name)

const drive = fileURLToPath(new URL('./waiting-drive.mjs', import.meta.url))
const TIMEOUT = 8000

export const show = (v) => inspect(v, { depth: 4, breakLength: Infinity })

/** The problem that stops every case of a check, in plain words, or null. */
function problem(file, fn, runs, body) {
  const timedOut = runs.find((r) => r.timedOut)
  if (timedOut) {
    return {
      name: 'Every case finishes',
      passed: false,
      message: `Check stopped waiting after a few seconds, while ${fn} was still running. A loop that never ends is the usual cause, and a loop that waits for an answer to arrive is one: an answer that comes later can only arrive once the code running now has finished, so the loop never sees it. Hand the work that needs the answer to the machine instead, in a function. A line outside every function that waits on a machine does the same: keep such lines in src/demo.js.`,
      output: 'Stopped after a few seconds'
    }
  }
  const broken = runs.find((r) => !r.ok)
  if (broken) {
    return {
      name: `${file} runs`,
      passed: false,
      message: `Check could not run ${fn}. Run node src/demo.js in the terminal and read the error.`,
      output: broken.error
    }
  }
  const reports = runs.map((r) => r.value)
  const load = reports.find((r) => r.loadError)
  if (load) {
    const error = load.loadError
    const exported = error.match(/does not provide an export named '([\w$]+)'/)
    const message = /Unexpected reserved word/.test(error)
      ? `${file} uses await inside a function that is not async. await only works inside a function marked async, so Node cannot read the file at all. Run node src/demo.js to see the line it points at.`
      : exported
        ? `${file} imports ${exported[1]}, but the file it imports from has nothing by that name. Keep the import line at the top as the starter had it, capital letters included.`
        : /^SyntaxError/.test(error)
          ? `${file} has a line Node cannot read. Run node src/demo.js in the terminal, read the line the error points at, fix it and check again.`
          : `${file} stops with an error before Check can use it. Run node src/demo.js in the terminal and read the line the error points at.`
    return { name: `${file} runs`, passed: false, message, output: error }
  }
  const missing = reports.find((r) => r.missing?.length)
  if (missing) {
    const name = missing.missing[0]
    return {
      name: `${file} has ${name}`,
      passed: false,
      message: `Check cannot find a function called ${name} that ${file} exports. Keep the name the task gives, capital letters included, with export in front of it or on an export line.`
    }
  }
  const unwritten = reports.find((r) =>
    [...r.thrown, ...r.unhandled, r.outcome?.error?.message ?? ''].some((e) =>
      /Not implemented/.test(e)
    )
  )
  if (unwritten) {
    return {
      name: `${fn} is written`,
      passed: false,
      message: /Not implemented/.test(body)
        ? `${fn} still throws 'Not implemented'. Replace that line with your code.`
        : `${fn} uses a function that still throws 'Not implemented'. Write the task it belongs to first, then check again.`
    }
  }
  return null
}

/** The report's log as numbered lines, the way the learner reads it under a case. */
export const story = (r) =>
  r.log.length ? r.log.map((line, i) => `${i + 1}. ${line}`).join('\n') : 'Nothing happened.'

/**
 * Runs each case and judges it. A case is { name, run, args, setup, judge } where `run` names an
 * export of the issue's grader/drive.mjs, `setup` says in words what the case does, and
 * `judge(report)` gives back a message when the case fails, or nothing when it passes. The output
 * of every case is its setup and what happened, in order.
 */
export async function play(t, { file, fn, cases }) {
  const dir = await t.sandbox({
    '.grader/drive.mjs': t.chapterPath('grader/drive.mjs'),
    '.grader/waiting.mjs': drive,
    'src/shop.js': t.chapterPath('grader/shop.mjs')
  })
  const runs = await Promise.all(
    cases.map((c) => t.call(dir, '.grader/drive.mjs', c.run, c.args ?? [], { timeoutMs: TIMEOUT }))
  )
  const body = partOf(code(await readSource(t, file).catch(() => '')), fn)
  const stop = problem(file, fn, runs, body)
  if (stop) return [stop]
  return cases.map((c, i) => {
    const r = runs[i].value
    const message = r.endless
      ? r.log.some((l) => l.startsWith('a repeating timer'))
        ? 'A repeating timer kept running until Check stopped it. setInterval calls its function again and again, until the timer is stopped with clearInterval; setTimeout calls it once.'
        : `${fn} kept starting new waits until Check stopped it. Look at what decides when it stops trying.`
      : c.judge(r)
    return {
      name: c.name,
      passed: !message,
      message: message || undefined,
      output: `${c.setup}\nWhat happened, in order:\n${story(r)}`
    }
  })
}

/** Whether `name` is called somewhere in the text of the top-level function `fn`. */
export const calledIn = (text, fn, name) =>
  new RegExp(`\\b${name}\\s*\\(`).test(partOf(code(text), fn))

/** A detail for a task built on an earlier one that is not right yet. */
export const earlier = (fn, what) => ({
  name: `${what} works`,
  passed: false,
  message: `${fn} uses ${what}, which is not right yet. Get that task to pass first, then check again.`
})

/** The message when a promise was looked for and something else came back. */
export function notPromise(fn, r) {
  const back = r.log.find((l) => l.startsWith(`${fn} gave back`))
  if (/gave back undefined$/.test(back ?? '')) {
    return `${fn} gives back undefined, not a promise. A promise made inside a function reaches the caller only when the function gives it back with return.`
  }
  if (/undefined|\[object Promise\]|Promise \{/.test(back ?? '')) {
    return `${fn} gave back ${back.slice(`${fn} gave back `.length)} right away. It used what a machine gave back as if it were the answer, but that is a promise of the answer: the answer is only there once the promise is fulfilled.`
  }
  return `${fn} gives back a value right away, not a promise. The caller waits on what ${fn} gives back, so it must be a promise of the answer.`
}

/** The message for a promise from the learner's code that never settled. */
export const neverSettled = (fn) =>
  `The promise ${fn} gave back never settled. Check answered every question and ran every timer, and it was still waiting. Look for the place that should fulfil it: a promise you make yourself settles only when its resolve is called.`

/** What the learner's promise was fulfilled with or rejected with, in words. */
export function ending(r) {
  const o = r.outcome ?? {}
  if (o.state === 'fulfilled') return `fulfilled with ${o.shown}`
  if (o.state === 'rejected') return `rejected with ${o.error.name ? `${o.error.name}: ` : ''}${o.error.message}`
  return o.state
}

/** Text with case, spaces and marks taken out, to tell a near miss from a wrong answer. */
export const loose = (text) => String(text).toLowerCase().replace(/[^a-z0-9]/g, '')

/** The message for a function that stopped with an error before it gave anything back. */
export function stopped(fn, error) {
  const unknown = /ReferenceError: ([\w$]+) is not defined/.exec(error)
  if (unknown) {
    return `${fn} stops at ${unknown[1]}, a name it cannot see from where it is used. Check the spelling, capital letters included. A value that arrives later is only there inside the function that receives it, as that function's parameter.`
  }
  return `${fn} stopped with an error before it gave anything back. Read the error in the list below.`
}

/**
 * Judges a case whose function gives back a promise that should be fulfilled with `want`.
 * `explain(r)` may name the cause of a wrong value or a rejection more exactly.
 */
export function promised(r, fn, want, explain = () => undefined) {
  const sync = r.log.find((l) => l.startsWith(`${fn} stopped with `))
  if (sync) return stopped(fn, sync.slice(`${fn} stopped with `.length))
  const o = r.outcome ?? {}
  if (o.state === 'not a promise') return notPromise(fn, r)
  if (o.state === 'pending') {
    return r.thrown.length
      ? `A function that ran later stopped with an error, so the promise ${fn} gave back was never settled. Read the error in the list below.`
      : neverSettled(fn)
  }
  if (o.state === 'rejected') {
    const error = `${o.error.name ? `${o.error.name}: ` : ''}${o.error.message}`
    return (
      explain(r) ??
      (o.error.name === 'ReferenceError'
        ? stopped(fn, error)
        : `The promise ${fn} gave back was rejected, which means it failed, with ${error}. Follow the list below to the step where it went wrong.`)
    )
  }
  if (o.shown === show(want)) return undefined
  if (o.json !== undefined && !/Promise|undefined|NaN/.test(o.shown) && isDeepStrictEqual(o.json, want)) return undefined
  if (o.shown === 'undefined') {
    return (
      explain(r) ??
      `The promise ${fn} gave back was fulfilled with undefined: the answer was never given back. Look for a way to the end with no return in it, such as an arrow function with braces after =>, or one part of an if or a try.`
    )
  }
  return (
    explain(r) ??
    (typeof want === 'string' && o.shown.startsWith("'") && loose(o.shown) === loose(want)
      ? `Close. ${fn} gave nearly the text the task asks for. Compare it letter by letter with the example in the task: capital letters, spaces and colons count.`
      : `The promise ${fn} gave back was fulfilled with something other than what the task asks for. Compare it with the example in the task.`)
  )
}
