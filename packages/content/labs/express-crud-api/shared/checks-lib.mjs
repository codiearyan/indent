// Helpers shared by every issue's grader/checks.mjs. Runs in the grader process, never in the workspace.
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'

const harness = fileURLToPath(new URL('./harness.mjs', import.meta.url))

export const same = (a, b) => isDeepStrictEqual(a, b)
export const isJson = (res) => /^application\/json\b/i.test(res.headers['content-type'] ?? '')
export const errorCode = (res) => res.json?.error?.code
export const hasMessage = (res) =>
  typeof res.json?.error?.message === 'string' && res.json.error.message.trim().length > 0

// Every check gets its own workshops, so the starter's data cannot be typed in as the answer.
export const seed = [
  { id: 11, title: 'Slab-built planters', day: 'mon', seats: 7, priceCents: 4100 },
  { id: 12, title: 'Raku evening', day: 'fri', seats: 5, priceCents: 6500 },
  { id: 15, title: 'Coil pots', day: 'mon', seats: 9, priceCents: 3000 }
]

export const sandbox = (t) => t.sandbox({ '.grader/harness.mjs': harness })

const clip = (text, max = 600) => (text.length > max ? `${text.slice(0, max)} ...` : text)

export function show(req, res) {
  const line = `${req.method ?? 'GET'} ${req.path}`
  const sent =
    req.json !== undefined ? ` ${JSON.stringify(req.json)}` : req.body ? ` ${req.body}` : ''
  const key = req.headers?.['x-staff-key'] ? ` [x-staff-key: ${req.headers['x-staff-key']}]` : ''
  if (!res) return `${line}${sent}${key}\n(no response)`
  if (res.error) return `${line}${sent}${key}\n${res.error}`
  const headers = ['content-type', 'location']
    .filter((h) => res.headers[h] !== undefined)
    .map((h) => `${h}: ${res.headers[h]}`)
  return [`${line}${sent}${key}`, `-> ${res.status}`, ...headers, clip(res.text)].join('\n')
}

/** A whole check failed before any request could be judged, e.g. createApp threw. */
export function broken(name, r) {
  const unwritten = /Not implemented/.test(r.error)
  return [
    {
      name,
      passed: false,
      message: unwritten
        ? `Something you call still throws 'Not implemented'. Replace that line with your code.`
        : 'The check could not start your app or finish its requests. Read the error, then run node try.js.',
      output: r.error
    }
  ]
}

/** Judges each case against its response: { name, req, ok(res) => boolean, hint }. */
export function judge(cases, responses) {
  return cases.map((c, i) => {
    const res = responses[i]
    let passed = false
    try {
      passed = Boolean(res && !res.error && c.ok(res))
    } catch {}
    const message = res?.error ? `${c.hint} The request got no proper response.` : c.hint
    return { name: c.name, passed, message: passed ? undefined : message, output: show(c.req, res) }
  })
}

/** Sends every case's request to createApp() in order and judges the responses. */
export async function checkApp(t, cases, options = {}) {
  const dir = await sandbox(t)
  const r = await t.call(dir, '.grader/harness.mjs', 'app', [cases.map((c) => c.req), options])
  if (!r.ok) return broken('The app starts', r)
  return judge(cases, r.value.responses)
}

/** Sends every case's request to workshopsRouter() mounted at `options.mount`. */
export async function checkRouter(t, cases, options) {
  const dir = await sandbox(t)
  const r = await t.call(dir, '.grader/harness.mjs', 'router', [cases.map((c) => c.req), options])
  if (!r.ok) return broken('workshopsRouter can be mounted', r)
  return judge(cases, r.value.responses)
}

/** Calls validateWorkshop for each case: { name, body?, options?, want, hint }. */
export async function checkValidate(t, cases) {
  const dir = await sandbox(t)
  const r = await t.call(dir, '.grader/harness.mjs', 'validate', [
    cases.map(({ body, options }) => ({ body, options }))
  ])
  if (!r.ok) return broken('validateWorkshop can be called', r)
  const unwritten = r.value.find((x) => /Not implemented/.test(x.thrown ?? ''))
  if (unwritten) {
    return [
      {
        name: 'validateWorkshop is written',
        passed: false,
        message: `validateWorkshop still throws 'Not implemented'. Replace that line with your code.`,
        output: unwritten.thrown
      }
    ]
  }
  return cases.map((c, i) => {
    const got = r.value[i]
    const passed = got.thrown === undefined && same(got.value, c.want)
    const call = `validateWorkshop(${'body' in c ? JSON.stringify(c.body) : 'undefined'}${c.options ? `, ${JSON.stringify(c.options)}` : ''})`
    return {
      name: c.name,
      passed,
      message: passed ? undefined : got.thrown ? `It threw an error. ${c.hint}` : c.hint,
      output: got.thrown
        ? `${call}\nthrew ${got.thrown}`
        : `${call}\nreturned ${JSON.stringify(got.value)}`
    }
  })
}
