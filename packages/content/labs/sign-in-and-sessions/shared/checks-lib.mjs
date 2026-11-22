// Helpers shared by every issue's grader/checks.mjs. Runs in the grader process, never in the workspace.
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'

const harness = fileURLToPath(new URL('./harness.mjs', import.meta.url))

export const same = (a, b) => isDeepStrictEqual(a, b)
export const isJson = (res) => /^application\/json\b/i.test(res.headers?.['content-type'] ?? '')
export const errorCode = (res) => res.json?.error?.code
export const hasMessage = (res) =>
  typeof res.json?.error?.message === 'string' && res.json.error.message.trim().length > 0
export const notImplemented = (text) => /Not implemented/.test(text ?? '')

// Every check gets its own workshops and staff, so nothing in the starter can be typed in as the answer.
export const seed = [
  { id: 11, title: 'Slab-built planters', day: 'mon', seats: 7, priceCents: 4100 },
  { id: 12, title: 'Raku evening', day: 'fri', seats: 5, priceCents: 6500 },
  { id: 15, title: 'Coil pots', day: 'mon', seats: 9, priceCents: 3000 }
]
export const bowls = { title: 'Throwing bowls', day: 'tue', seats: 6, priceCents: 4400 }

// Ids follow this order: Kofi is 1, Sunniva 2, Dilys 3.
export const people = [
  { name: 'Kofi', email: 'kofi.a@studio.test', role: 'teacher', password: 'lemon-slip-42' },
  { name: 'Sunniva', email: 'sunniva.h@studio.test', role: 'desk', password: 'oxide-blue-77' },
  { name: 'Dilys', email: 'dilys.m@studio.test', role: 'owner', password: 'cone-ten-firing' }
]
export const [kofi, sunniva, dilys] = people
export const publicOf = (person, id) => ({
  id,
  name: person.name,
  email: person.email,
  role: person.role
})

/** A fresh copy of the workspace with the harness, and `fromSolution` files put back as solved. */
export const sandbox = (t, fromSolution = []) =>
  t.sandbox({
    '.grader/harness.mjs': harness,
    ...Object.fromEntries(fromSolution.map((rel) => [rel, t.chapterPath(`solution/${rel}`)]))
  })

const clip = (text, max = 600) => (text.length > max ? `${text.slice(0, max)} ...` : text)

export function show(req, res) {
  const line = `${req.method ?? 'GET'} ${req.path}`
  const sent =
    req.json !== undefined ? ` ${JSON.stringify(req.json)}` : req.body ? ` ${req.body}` : ''
  const head = Object.entries(req.headers ?? {})
    .map(([name, value]) => `\n${name}: ${value}`)
    .join('')
  const asked = `${line}${sent}${head}`
  if (!res) return `${asked}\n(no response)`
  if (res.error) return `${asked}\n${res.error}`
  const headers = ['content-type', 'location']
    .filter((h) => res.headers[h] !== undefined)
    .map((h) => `${h}: ${res.headers[h]}`)
  const cookies = (res.cookies ?? []).map((c) => `set-cookie: ${c}`)
  const late = res.late ? [`(then) ${res.late}`] : []
  return [asked, `-> ${res.status}`, ...headers, ...cookies, clip(res.text), ...late].join('\n')
}

/** Splits a set-cookie line into its name, value and attributes (names in lower case). */
export function parseCookie(line) {
  const [pair, ...parts] = line.split(';').map((part) => part.trim())
  const at = pair.indexOf('=')
  const attrs = {}
  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq === -1) attrs[part.toLowerCase()] = true
    else attrs[part.slice(0, eq).toLowerCase()] = part.slice(eq + 1)
  }
  return { name: pair.slice(0, at), value: pair.slice(at + 1), attrs }
}

export const cookieNamed = (res, name) =>
  (res?.cookies ?? []).map(parseCookie).find((c) => c.name === name)

/** A whole check failed before anything could be judged. */
export function broken(name, error) {
  return [
    {
      name,
      passed: false,
      message: notImplemented(error)
        ? `Something you call still throws 'Not implemented'. Replace that line with your code.`
        : 'The check could not run your code. Read the error, then run node try.js.',
      output: error
    }
  ]
}

const TWICE =
  'The client got this answer, and then the code went on running and tried to answer again. Once a handler has sent an answer, nothing after it should run.'
const CRASHED =
  'Your code threw an error while it handled this request, so the app answered 500. The error it logged is below the response.'

/**
 * Runs each case in a fresh app and judges it. A case is { name, requests, sessions?, clock?,
 * ok(r), hint, may500? }, where r holds the responses, `res` (the last one), what was printed
 * (`out`), the sessions the store holds afterwards, the workshops and the staff ids.
 * `hint` is a string, or a function of r when the cause depends on what came back.
 * Returns { details } plus the raw run, so a check can look for secrets in it.
 */
export async function checkCases(t, list, options = {}, fromSolution = []) {
  const dir = await sandbox(t, fromSolution)
  const r = await t.call(dir, '.grader/harness.mjs', 'cases', [
    list.map(({ requests, sessions, clock }) => ({ requests, sessions, clock })),
    options
  ])
  if (!r.ok) return { details: broken('The app starts', r.error) }
  const runs = r.value.results.map((run) => ({ ...run, res: run.responses.at(-1) }))
  const start = runs.find((run) => run.error)
  if (start && runs.every((run) => run.error)) {
    return { details: broken('The app starts', `${start.error}\n${start.out}`.trim()) }
  }
  const details = list.map((c, i) => judgeCase(c, runs[i]))
  return { details, runs, hashes: r.value.hashes }
}

function judgeCase(c, run) {
  const output = [
    ...c.requests.map((req, i) => show(req, run.responses[i])),
    ...(run.error ? [`createApp() threw ${run.error}`] : [])
  ]
  const crashed = run.responses.some((res) => res.status === 500) && !c.may500
  if (crashed && run.out.trim()) output.push(`The app logged:\n${clip(run.out.trim(), 1200)}`)
  let passed = false
  try {
    passed = Boolean(
      !run.error && run.responses.every((res) => !res.error && !res.late) && c.ok(run)
    )
  } catch {}
  return {
    name: c.name,
    passed,
    message: passed ? undefined : explain(c, run, crashed),
    output: output.join('\n\n')
  }
}

function explain(c, run, crashed) {
  if (run.error) return `createApp() threw before any request was sent. Read the error below.`
  const hint = typeof c.hint === 'function' ? c.hint(run) : c.hint
  if (run.responses.some((res) => res.error)) return `${hint} The request got no proper response.`
  if (run.responses.some((res) => res.late)) return TWICE
  if (crashed)
    return notImplemented(run.out) ? broken('', run.out)[0].message : `${CRASHED} ${hint}`
  return hint
}

// A long secret also leaks when half of it is shown.
function pieces(secret) {
  if (typeof secret !== 'string' || secret.length === 0) return []
  if (secret.length < 32) return [secret]
  const half = secret.length / 2
  return Array.from({ length: secret.length - half + 1 }, (_, i) => secret.slice(i, i + half))
}

/** The hash part of each stored '<salt>:<hash>' value, the part that must never leave. */
export const hashParts = (hashes) => hashes.map((h) => String(h).split(':').at(-1))

/**
 * Looks for each secret ({ kind, value }) in each place ({ where, text }) and returns the first
 * place one shows, as { kind, where, text }, or undefined.
 */
export function findLeak(places, secrets) {
  for (const place of places) {
    for (const secret of secrets) {
      if (pieces(secret.value).some((piece) => String(place.text).includes(piece))) {
        return { kind: secret.kind, where: place.where, text: place.text }
      }
    }
  }
  return undefined
}

/** What a run printed, and every response's body and headers (set-cookie left out). */
export function placesOf(c, run) {
  const said = run.responses.map((res, i) => ({
    where: `the answer to ${c.requests[i].method ?? 'GET'} ${c.requests[i].path}`,
    text: `${JSON.stringify(res.headers ?? {})}\n${res.text ?? ''}`
  }))
  return [{ where: 'what the app printed', text: run.out }, ...said]
}

/** One result that says whether any secret reached a log or a response, over every run. */
export function noLeaks(name, list, runs, secretsOf, messages) {
  for (const [i, c] of list.entries()) {
    const run = runs[i]
    if (!run || run.error) continue
    const leak = findLeak(placesOf(c, run), secretsOf(c, run))
    if (leak) {
      return {
        name,
        passed: false,
        message: messages[leak.kind],
        output: `In ${leak.where}, while: ${c.name}\n\n${clip(leak.text, 1200)}`
      }
    }
  }
  return { name, passed: true, output: 'No password, hash or token showed in a log or a response.' }
}
