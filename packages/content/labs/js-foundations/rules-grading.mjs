// What the graders of "Rules of the shop" share. From the functions issue on, the learner writes
// top-level functions and the starter's last line exports them for the flow. A check copies the
// file into a sandbox, drops the demo lines that print at the top level (so one task's broken
// demo cannot fail another task), appends a hidden export that runs each case as an expression
// inside the module, and reads back what the case gave and what it printed.
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { code, fileProblem, run, show as showRead, source } from './grading.mjs'

const RUNNER = '__indentCase'
const TIMEOUT = 5000

const runner = (exprs) => `
;export function ${RUNNER}(i) {
  const show = (v) => {
    if (typeof v === 'function') return { type: 'function', name: v.name }
    if (v === undefined) return { type: 'undefined' }
    if (typeof v === 'number' && Number.isNaN(v)) return { type: 'NaN' }
    return { type: typeof v, value: v }
  }
  const printed = []
  const log = console.log
  console.log = (...parts) => printed.push(parts.map(String).join(' '))
  try {
    const cases = [${exprs.map((e) => `() => (${e})`).join(', ')}]
    return { result: show(cases[i]()), printed }
  } catch (error) {
    return { threw: error instanceof Error ? error.name + ': ' + error.message : String(error), printed }
  } finally {
    console.log = log
  }
}
`

/** Lines at the top level that only print, like the starter's demo lines. */
const withoutDemo = (text) =>
  text
    .split('\n')
    .map((line) => (/^console\.log\(.*\)\s*;?\s*$/.test(line) ? '' : line))
    .join('\n')

export const readSource = (t, file) => readFile(join(t.workspace, file), 'utf8')

/** How a value read back looks to the learner. */
export function show(v) {
  if (!v) return 'nothing'
  if (v.type === 'function') return v.name ? `the function ${v.name}` : 'a function with no name'
  if (v.type === 'undefined' || v.type === 'NaN') return v.type
  return JSON.stringify(v.value)
}

const matches = (v, expected) =>
  expected && typeof expected === 'object' && 'fn' in expected
    ? v.type === 'function' && v.name === expected.fn
    : v.type !== 'undefined' && v.type !== 'NaN' && isDeepStrictEqual(v.value, expected)

/** One detail for a file that cannot be loaded, or null. */
function loadProblem(file, r) {
  if (r.ok) return null
  const error = r.error ?? ''
  const exported = error.match(/Export '([\w$]+)' is not defined/)
  const twice = error.match(/Identifier '([\w$]+)' has already been declared/)
  const message = r.timedOut
    ? `${file} did not finish within a few seconds, so Check stopped it. A loop that never ends is the usual cause: make sure its condition turns false. In the terminal, Ctrl+C stops a file that keeps running.`
    : exported
      ? `The last line of ${file} names ${exported[1]}, but the file has no function called ${exported[1]} any more. Keep each function with the name the task gives, capital letters included.`
      : twice
        ? `Two things in ${file} are called ${twice[1]}. A name can be made only once in the same place, so keep one of them.`
        : /Unexpected end of input/.test(error)
          ? `Node reached the end of ${file} while a { was still open. Every { needs its }, so look for the one that is missing.`
          : /Unexpected token 'export'/.test(error)
            ? `Node reached the export line at the bottom of ${file} while a { was still open. Every { needs its }, so look for the one that is missing.`
            : /^SyntaxError/.test(error)
              ? `${file} has a line Node cannot read. Run node ${file} in the terminal, read the line the error points at, fix it and check again.`
              : `${file} stops with an error before Check can use it. Run node ${file} in the terminal and read the line the error points at.`
  return {
    name: `${file} runs`,
    passed: false,
    message,
    output: r.timedOut ? 'Stopped after a few seconds' : error
  }
}

/**
 * Runs each expression in the learner's module and returns, per expression,
 * { result, printed } or { threw, printed }, or { problem } when the file does not load.
 */
export async function evaluate(t, file, exprs) {
  const dir = await t.sandbox()
  const path = join(dir, file)
  await writeFile(path, withoutDemo(await readFile(path, 'utf8')) + runner(exprs))
  const runs = await Promise.all(
    exprs.map((_, i) => t.call(dir, file, RUNNER, [i], { timeoutMs: TIMEOUT }))
  )
  for (const r of runs) {
    if (!r.ok && r.timedOut) {
      return {
        problem: {
          name: 'Every call finishes',
          passed: false,
          message: `Check stopped waiting after a few seconds. A loop that never ends is the usual cause: make sure something inside the loop changes, so its condition turns false. In the terminal, Ctrl+C stops a file that keeps running.`,
          output: 'Stopped after a few seconds'
        }
      }
    }
    const problem = loadProblem(file, r)
    if (problem) return { problem }
  }
  return { results: runs.map((r) => r.value) }
}

/**
 * Checks a function with the learner's own cases. Each case is { name, expr, expected, hint }
 * and may have explain(result) for a message about that exact result. A message names what to
 * look at; the output shows what the learner's code gave, never what a case expects.
 */
export async function calls(t, { file, fn, list }) {
  const { results, problem } = await evaluate(t, file, list.map((c) => c.expr))
  if (problem) return [problem]
  const given = results.map((r) => r.result)
  const answersOthers = given.some((v) => v && v.type !== 'undefined')
  // The same answer for cases that need different ones means the inputs were not used.
  const expectedKinds = new Set(list.map((c) => JSON.stringify(c.expected)))
  const sameEveryTime =
    expectedKinds.size > 1 &&
    given.every((v) => v && given[0] && isDeepStrictEqual(v, given[0]))
  return list.map((c, i) => {
    const r = results[i]
    const v = r.result
    const passed = !r.threw && matches(v, c.expected)
    const printed = r.printed.length ? `\nIt printed:\n${r.printed.join('\n')}` : ''
    const output = `${c.expr}\n${r.threw ? `stopped with ${r.threw}` : `gave ${show(v)}`}${printed}`
    if (passed) return { name: c.name, passed, output }
    return { name: c.name, passed, message: why(fn, c, r, sameEveryTime, answersOthers), output }
  })
}

function why(fn, c, r, sameEveryTime, answersOthers) {
  if (r.threw) {
    const unknown = r.threw.match(/ReferenceError: ([\w$]+) is not defined/)
    if (unknown) {
      return `${fn} stops at ${unknown[1]}, a name it cannot see from where it is used. Check the spelling, capital letters included, and that the name is a parameter or is made inside ${fn} before that line.`
    }
    if (/is not a function/.test(r.threw)) {
      return `${fn} stops because something it calls is not a function. Read the error below: it names the value that was called.`
    }
    return `${fn} stops with an error for this case. Read the error below. ${c.hint}`
  }
  const v = r.result
  if (v.type === 'undefined') {
    if (r.printed.length) {
      return `${fn} prints its answer but gives nothing back. A function hands its answer back with return.`
    }
    return answersOthers
      ? `${fn} gave back undefined for this case, though it answers others. Follow this case through: a let made without a value stays undefined until something gives it one, and a function that ends without reaching a return gives back undefined.`
      : `${fn} gives nothing back yet. A function hands its answer back with return.`
  }
  const exact = c.explain?.(v)
  if (exact) return exact
  if (typeof c.expected === 'string' && v.type === 'string' && loose(v.value) === loose(c.expected)) {
    return `Close. ${fn} gave nearly the text the task asks for. Compare it letter by letter with the example in the task: capital letters, spaces and commas count.`
  }
  if (sameEveryTime) {
    return `${fn} gave the same answer for every case Check tried, though they need different answers. ${c.hint}`
  }
  return c.hint
}

const loose = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * For the first issue, where the learner writes top-level code with no functions: runs each case
 * with its own values swapped in, as the first part does, and compares the variable `name`.
 */
export async function decide(t, { file, name, task, list }) {
  const runs = await Promise.all(list.map((c) => run(t, file, { given: c.given, names: [name] })))
  for (const r of runs) {
    const problem = fileProblem(file, r)
    if (!problem) continue
    if (r.error?.includes(`${name} is not defined`)) {
      problem.message += ` If you made ${name} inside the braces of an if, make it once above the if instead: a name made inside { } is gone after the closing brace.`
    }
    return [problem]
  }
  if (runs.every((r) => r.values[name]?.type === 'missing')) {
    return [
      {
        name: `${name} is there`,
        passed: false,
        message: `Check cannot find a variable called ${name}. Make it under // ${task} with exactly that name, capital letters included. If you made it inside the braces of an if, make it once above the if instead: a name made inside { } is gone after the closing brace.`
      }
    ]
  }
  const reads = runs.map((r) => r.values[name])
  const stuck =
    reads.every((v) => v.type === reads[0].type && v.value === reads[0].value) &&
    new Set(list.map((c) => c.expected)).size > 1
  const details = list.map((c, i) => {
    const v = reads[i]
    const passed = v.type === typeof c.expected && v.value === c.expected
    const close =
      !passed &&
      typeof c.expected === 'string' &&
      v.type === 'string' &&
      loose(v.value) === loose(c.expected)
    const given = Object.entries(c.given)
      .map(([key, value]) => `${key} = ${JSON.stringify(value)}`)
      .join(', ')
    const message = passed
      ? undefined
      : typeof c.expected === 'number' && v.type === 'string'
        ? `${name} is text here, not a number: quotes make a value text. Write the number without quotes.`
        : close
          ? `Close. ${name} is nearly the text the task gives. Compare it letter by letter: capital letters and spaces count.`
          : stuck
            ? `${name} came out the same in every case Check tried, though they need different answers. Work it out from the names at the top of the file instead of typing the answer in, and look at the question in your if.`
            : c.hint
    return { name: c.name, passed, message, output: `With ${given}\n${name} is ${showRead(v)}` }
  })
  const printed = new RegExp(`\\bconsole\\.log\\([^\\n]*\\b${name}\\b`).test(
    code(await source(t, file))
  )
  return [
    ...details,
    shape(
      `Prints ${name}`,
      printed,
      `The task asks you to print ${name}. Add a console.log line for it under the task.`
    )
  ]
}

/**
 * The text of a top-level function or const, without comments: from its first line to the next
 * line that closes it at the left edge. Empty when it is not there.
 */
export function partOf(source, name) {
  const lines = code(source).split('\n')
  const start = lines.findIndex((l) =>
    new RegExp(`^(?:function\\s+${name}\\s*\\(|(?:const|let)\\s+${name}\\s*=)`).test(l)
  )
  if (start === -1) return ''
  const end = lines.findIndex((l, i) => i > start && /^\S/.test(l))
  return lines.slice(start, end === -1 ? undefined : end).join('\n')
}

/** A detail for how something must be written, judged on the learner's source. */
export function shape(name, passed, message) {
  return { name, passed, message: passed ? undefined : message }
}
