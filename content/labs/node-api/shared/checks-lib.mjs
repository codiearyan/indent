// Helpers shared by every chapter's grader/checks.mjs. Runs in the grader process, never in the workspace.
import { fileURLToPath } from 'node:url'

const harness = fileURLToPath(new URL('./harness.mjs', import.meta.url))

export const sandbox = (t, overrides = {}) =>
  t.sandbox({ '.grader/harness.mjs': harness, ...overrides })

export const runApp = (t, dir, requests, options = {}) =>
  t.call(dir, '.grader/harness.mjs', 'app', [requests, options])

export const runProbe = (t, dir, kind, cases, requests) =>
  t.call(dir, '.grader/harness.mjs', 'probe', [kind, cases, requests])

const clip = (text, max = 600) => (text.length > max ? `${text.slice(0, max)} ...` : text)

export function show(req, res) {
  const line = req.label ?? `${req.method ?? 'GET'} ${req.path}`
  const sent = req.json !== undefined ? ` ${JSON.stringify(req.json)}` : req.body ? ` (${req.body.length} chars)` : ''
  const auth = req.headers?.authorization ? ` [authorization: ${req.headers.authorization}]` : ''
  if (!res) return `${line}${sent}${auth}\n(no response)`
  if (res.error) return `${line}${sent}${auth}\n${res.error}`
  const headers = ['content-type', 'content-length', 'location', 'allow', 'www-authenticate', 'x-request-id']
    .filter((h) => res.headers[h] !== undefined)
    .map((h) => `${h}: ${res.headers[h]}`)
  return [`${line}${sent}${auth}`, `-> ${res.status}`, ...headers, clip(res.text)].join('\n')
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
    const passed = Boolean(res && !res.error && c.ok(res))
    const message = res?.error
      ? `${c.hint} The request got no proper response.`
      : /Not implemented/.test(res?.text ?? '')
        ? `The code behind this request still throws 'Not implemented'. ${c.hint}`
        : c.hint
    return {
      name: c.name,
      passed,
      message: passed ? undefined : message,
      output: show(c.req, res)
    }
  })
}

/** Sends every case's request to the app in order and judges the responses. */
export async function checkApp(t, dir, cases, options, startName = 'The app starts') {
  const r = await runApp(t, dir, cases.map((c) => c.req), options)
  if (!r.ok) return broken(startName, r)
  return judge(cases, r.value.responses)
}

export const isJson = (res) => /^application\/json\b/i.test(res.headers['content-type'] ?? '')
export const errorCode = (res) => res.json?.error?.code
