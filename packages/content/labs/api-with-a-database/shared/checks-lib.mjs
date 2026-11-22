// Helpers shared by every issue's grader/checks.mjs. Runs in the grader process, never in the workspace.
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'

const harness = fileURLToPath(new URL('./harness.mjs', import.meta.url))

export const same = (a, b) => isDeepStrictEqual(a, b)
export const errorCode = (res) => res.json?.error?.code
export const staffKey = 'check-key-41'
export const staff = { 'x-staff-key': staffKey }

// The checks' own workshops. Odd ids and prices, so none of them can turn up in SQL by chance.
export const glaze = { id: 4811, title: 'Ash glazes', day: 'mon', seats: 7, priceCents: 4150 }
export const saggar = { id: 4817, title: 'Saggar firing', day: 'fri', seats: 5, priceCents: 6350 }
export const tiles = { id: 4823, title: 'Pressed tiles', day: 'mon', seats: 9, priceCents: 3050 }
export const openDay = { id: 4829, title: 'Open studio hour', day: 'sat', seats: 12, priceCents: 0 }
export const workshops = [glaze, saggar, tiles, openDay]

export const sandbox = (t) => t.sandbox({ '.grader/harness.mjs': harness })

const clip = (text, max = 600) => (text.length > max ? `${text.slice(0, max)} ...` : text)
const pattern = (value) =>
  typeof value === 'number'
    ? new RegExp(`(^|[^\\d.])${value}(?![\\d.])`)
    : new RegExp(`(?<!\\w)${String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\w)`)

/** The first piece of SQL that has one of `values` written into its text, or undefined. */
export function written(sql, values) {
  for (const text of sql) {
    const value = values.find((v) => pattern(v).test(text))
    if (value !== undefined) return { text, value }
  }
  return undefined
}

export const VALUES_IN_SQL = (found) =>
  `The value ${JSON.stringify(found.value)} was written into the SQL text. Values should reach the database apart from the query, even when they were cleaned or turned into numbers first.`

export function show(req, res) {
  if (req.restart) return '(the server restarts and opens the same database file again)'
  const line = `${req.method ?? 'GET'} ${req.path}`
  const sent = req.json !== undefined ? ` ${JSON.stringify(req.json)}` : ''
  if (!res) return `${line}${sent}\n(no response)`
  if (res.error) return `${line}${sent}\n${res.error}`
  const location = res.headers.location ? [`location: ${res.headers.location}`] : []
  const logged = res.logged?.length ? ['logged by the error handler:', ...res.logged] : []
  return [`${line}${sent}`, `-> ${res.status}`, ...location, clip(res.text), ...logged].join('\n')
}

export const showSql = (sql) =>
  sql.length
    ? `SQL handed to the database:\n${sql.join('\n---\n')}`
    : 'No SQL was handed to the database.'

const unwritten = (res) => res?.logged?.find((line) => /Not implemented/.test(line))

/** A whole check failed before anything could be judged. */
export function broken(name, error) {
  return [
    {
      name,
      passed: false,
      message: /Not implemented/.test(error)
        ? `Something you call still throws 'Not implemented'. Replace that line with your code.`
        : 'The check could not run your code. Read the error, then run node try.js.',
      output: error
    }
  ]
}

/**
 * Runs `cases` with the harness, one fresh database each, and judges every request that has an
 * `ok`. A case is { workshops, bookings, requests, file?, failSecond? }; a request is
 * { req, name, ok(res, after), hint, values?, may500? }. `values` must never be written into the
 * SQL that request hands the database. `more(results)` adds results of its own.
 */
export async function checkApp(t, cases, more = () => []) {
  const dir = await sandbox(t)
  const r = await t.call(dir, '.grader/harness.mjs', 'app', [
    cases.map(({ requests, ...c }) => ({ ...c, requests: requests.map((x) => x.req) })),
    { staffKey }
  ])
  if (!r.ok) return broken('The app starts', r.error)
  const results = []
  for (const [i, c] of cases.entries()) {
    const run = r.value[i]
    if (run.error) return broken('The app starts', run.error)
    const stub = run.responses.map(unwritten).find(Boolean)
    if (stub) return broken('Your code is written', stub)
    for (const [j, x] of c.requests.entries()) {
      if (!x.ok) continue
      const res = run.responses[j]
      results.push(judge(x, res, run.after))
    }
  }
  return [...results, ...more(r.value)]
}

function judge(x, res, after) {
  const output = [show(x.req, res)]
  let passed = false
  let message
  try {
    passed = Boolean(res && !res.error && x.ok(res, after))
  } catch {}
  const found = res?.sql && x.values ? written(res.sql, x.values) : undefined
  if (found) {
    passed = false
    message = VALUES_IN_SQL(found)
    output.push(`The SQL with the value in it:\n${found.text}`)
  } else if (!passed) {
    const hint = typeof x.hint === 'function' ? x.hint(res ?? {}, after) : x.hint
    if (!res || res.error) message = `${hint} The request got no proper response.`
    else if (res.status === 500 && !x.may500) {
      const said = (pattern) => res.logged?.some((line) => pattern.test(line))
      message = said(/cannot be bound to SQLite parameter/)
        ? 'The database was handed a value it cannot store, so the error handler answered 500. SQLite takes numbers, text and null, but not undefined: look at what you hand over for a field or filter that was not given.'
        : said(/FOREIGN KEY constraint failed/)
          ? 'The database refused the row because the workshop it points at is not there, and that error reached the error handler as a 500. Find out whether the workshop exists before you add the row.'
          : 'Your code threw an error while it handled this request, so the error handler answered 500. Read what it logged below, then run node try.js.'
    } else message = hint
    if (res?.sql) output.push(showSql(res.sql))
  }
  return {
    name: x.name,
    passed,
    message: passed ? undefined : message,
    output: output.join('\n\n')
  }
}

/** Results with their message cleared when they passed. */
export const clear = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))
