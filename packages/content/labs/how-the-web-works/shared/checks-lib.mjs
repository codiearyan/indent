// What every issue's grader/checks.mjs shares. Runs in the grader process; the learner's code runs
// in a child through harness.mjs, against a server the check starts with its own paths and data.
import { fileURLToPath } from 'node:url'

const harness = fileURLToPath(new URL('./harness.mjs', import.meta.url))

const HARNESS = '.grader/harness.mjs'

const literal = (value) => (typeof value === 'string' ? `'${value}'` : JSON.stringify(value))

/** How the call looks in the output, with the check server's real address in it. */
export const callText = (fn, args, base) =>
  `${fn}(${args.map((a) => literal(typeof a === 'string' ? a.replaceAll('$base', base) : a)).join(', ')})`

/** What kind of value a function gave back, in plain words. */
export function kindText(v) {
  const words = {
    string: 'text',
    number: 'a number',
    boolean: 'true or false',
    array: 'a list',
    object: 'an object',
    url: 'a URL object',
    response: 'the whole answer',
    function: 'a function',
    error: 'an Error'
  }
  return words[v.kind] ?? v.kind
}

/** What the learner's function gave back, or how it stopped, in plain words. */
export function outcomeText(fn, outcome) {
  if (outcome.kind === 'returned') return `${fn} gave back ${outcome.shown}`
  if (outcome.kind === 'threw' && outcome.notError) {
    return `${fn} threw ${literal(outcome.message)}, which is not an Error`
  }
  if (outcome.kind === 'threw') {
    const cause = outcome.cause ? ` (cause: ${outcome.cause})` : ''
    return `${fn} stopped with ${outcome.name}: ${outcome.message}${cause}`
  }
  if (outcome.kind === 'timeout') return `${fn} had not finished after a few seconds`
  return `${fn} could not be called`
}

/** The requests the check's server received, with the headers a task is about, and their bodies. */
export function receivedText(
  received,
  headers = [],
  turnedAway = 0,
  total = received.length,
  bodies = false
) {
  if (turnedAway)
    return "The check's server could not read the request it was sent, and answered 400 Bad Request."
  if (total === 0) return "The check's server received no request."
  const lines = received.map((r) => {
    const names = headers.length ? [...new Set([...headers, ...extraHeaderNames(r)])] : []
    const shownHeaders = names
      .filter((h) => r.headers[h] !== undefined)
      .map((h) => `\n  ${h}: ${r.headers[h]}`)
      .join('')
    return `  ${r.method} ${r.target}${shownHeaders}${bodies && r.body ? bodyText(r.body) : ''}`
  })
  const count = total === 1 ? 'one request' : `${total} requests`
  const more = total > received.length ? `\n  ... and ${total - received.length} more` : ''
  return `The check's server received ${count}:\n${lines.slice(0, 8).join('\n')}${received.length > 8 ? `\n  ... and ${total - 8} more` : more}`
}

function bodyText(body) {
  const cut = body.length > 600 ? `${body.slice(0, 600)}...` : body
  return `\n\n  ${cut.replaceAll('\r\n', '\n').replaceAll('\n', '\n  ')}`
}

/** One detail for a result that cannot be judged case by case, or null. */
function problem(file, fn, r) {
  const o = r.outcome
  const fail = (name, message, output) => ({ name, passed: false, message, output })
  if (o.kind === 'load') {
    const syntax = o.name === 'SyntaxError'
    const message = syntax
      ? `${file} has a line Node cannot read, so nothing in it can run. Run node run.js in the terminal, read the line the error points at, fix it and check again.`
      : `${file} stops with an error while it loads, before Check can call ${fn}. Run node run.js in the terminal and read the error.`
    return fail(`${file} loads`, message, `${o.name}: ${o.message}`)
  }
  if (o.kind === 'missing') {
    return fail(
      `${fn} is there`,
      `Check cannot find a function called ${fn} that run.js can use. Keep the word export in front of the function, and its name exactly as the task gives it, capital letters included.`,
      `${file} has no export called ${fn}`
    )
  }
  if (o.kind === 'threw' && o.message === 'Not implemented') {
    return fail(
      `${fn} is written`,
      `${fn} still throws 'Not implemented'. Replace that line with your code.`,
      outcomeText(fn, o)
    )
  }
  if (o.kind === 'timeout') {
    return fail(
      `${fn} finishes`,
      `${fn} had not finished after a few seconds, so Check stopped waiting. A loop that never ends is the usual cause: make sure it stops after the number of tries it is given.`,
      `${receivedText(r.received, [], 0, r.receivedCount)}\n${outcomeText(fn, o)}`
    )
  }
  return null
}

/**
 * Runs the learner's `fn` once per case, each against a fresh server of the check's own, and
 * judges both sides. A case is { name, args, routes?, headers?, bodies?, judge(r) }, where judge gets
 * { received, outcome, printed, base } and returns a message when the case fails, or nothing.
 */
export async function cases(t, { file, fn, list }) {
  const dir = await t.sandbox({ [HARNESS]: harness })
  const runs = await Promise.all(
    list.map((c) =>
      t.call(dir, HARNESS, 'exchange', [{ file, fn, args: c.args, routes: c.routes ?? [] }])
    )
  )
  const crashed = runs.find((r) => !r.ok)
  if (crashed) {
    return [
      {
        name: `${fn} can be called`,
        passed: false,
        message: `Check could not finish calling ${fn}. Run node run.js in the terminal and read what it prints.`,
        output: crashed.error
      }
    ]
  }
  for (const r of runs) {
    const p = problem(file, fn, r.value)
    if (p) return [p]
  }
  return list.map((c, i) => {
    const r = runs[i].value
    const message = c.judge(r) ?? undefined
    const printed = r.printed.length ? `\nIt printed:\n${r.printed.join('\n')}` : ''
    const output = [
      callText(fn, c.args, r.base),
      ...(c.network === false
        ? []
        : [receivedText(r.received, c.headers, r.turnedAway, r.receivedCount, c.bodies)]),
      outcomeText(fn, r.outcome) + printed
    ].join('\n')
    return { name: c.name, passed: !message, ...(message ? { message } : {}), output }
  })
}

const FETCH_HEADERS = [
  'host',
  'connection',
  'accept',
  'accept-language',
  'sec-fetch-mode',
  'user-agent',
  'accept-encoding',
  'content-length',
  'content-type'
]

/** Header names a request carried beyond the ones fetch adds by itself. */
export const extraHeaderNames = (request) =>
  request.headerNames.map((n) => n.toLowerCase()).filter((n) => !FETCH_HEADERS.includes(n))

/** The message for a request the check's server could not read, which an unknown method causes. */
export const TURNED_AWAY =
  "The check's server could not read the request at all and turned it away. A method that servers do not know does that: the lesson lists the ones they do."

/** A message for the usual ways an answer read from fetch goes wrong, or null. */
export function fetchMistake(fn, outcome) {
  if (outcome.kind === 'threw') {
    if (/\.(text|json) is not a function/.test(outcome.message)) {
      return `${fn} stopped while reading the body: it was handed a promise, not the answer. fetch gives back a promise, so wait for it with await before you read from it.`
    }
    if (/Body is unusable|already been read/i.test(outcome.message)) {
      return `${fn} read the body of the same answer twice. A body can be read only once: read it one time, keep it in a const, and use that.`
    }
    if (/Cannot read properties of undefined/.test(outcome.message)) {
      return `${fn} read from something that is undefined. If that was the answer, it was read before it arrived: fetch gives back a promise, so wait for it with await.`
    }
    if (outcome.message === 'fetch failed') {
      return `${fn} sent its request somewhere nobody answers. Send it to the address ${fn} is given, built from what it is handed, never an address typed into the file.`
    }
    if (/Invalid URL|Failed to parse URL/i.test(outcome.message)) {
      return `${fn} handed fetch something that is not a whole address. Read the error below: an address needs its scheme and host, not only a path.`
    }
    return `${fn} stopped with an error. Read it below and run node run.js to see the same thing in the terminal.`
  }
  if (outcome.kind !== 'returned') return null
  const v = outcome.value
  if (v.kind === 'response') {
    return `${fn} gave back the whole answer instead of what the task asks to read from it. Read the body (or the part the task names) from the answer and give that back.`
  }
  if (v.kind.endsWith('-inside')) {
    const what = v.kind.startsWith('promise')
      ? 'a promise'
      : v.kind.startsWith('response')
        ? 'the whole answer'
        : 'the whole headers object'
    return `The ${v.key} that ${fn} gave back is ${what}, not a value. ${v.kind.startsWith('promise') ? 'Reading a body gives a promise: wait for it with await before you put it in the object.' : 'Read the one value the task asks for.'}`
  }
  if (v.kind === 'function') {
    return `${fn} gave back a function, not a value. A function only runs when it is called, with round brackets after its name.`
  }
  if (v.kind === 'undefined') {
    return `${fn} gave back undefined. Hand the value back with return.`
  }
  return null
}
