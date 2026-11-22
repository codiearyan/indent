// Copied into a check sandbox as .grader/harness.mjs and called with t.call. It starts a server of
// the check's own on a free port, calls one of the learner's functions against it, and returns
// both sides: every request the server received and what the function gave back. The server
// listens on 127.0.0.1 only and is always closed, so a check never leaves a port behind.
import { createServer } from 'node:http'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { inspect } from 'node:util'

const CALL_TIMEOUT_MS = 4000

const unhandled = []
process.on('unhandledRejection', (reason) => unhandled.push(errorInfo(reason)))

function errorInfo(err) {
  if (!(err instanceof Error)) return { name: 'Error', message: String(err), notError: true }
  const cause = err.cause?.code ?? err.cause?.message
  return { name: err.name, message: err.message, ...(cause ? { cause: String(cause) } : {}) }
}

/** Plain data for the check to compare, with the things a beginner hands back by mistake marked. */
function describe(value) {
  if (value instanceof Response) return { kind: 'response', status: value.status }
  if (value instanceof Promise) return { kind: 'promise' }
  if (value === undefined) return { kind: 'undefined' }
  if (value === null) return { kind: 'null' }
  if (typeof value === 'number' && Number.isNaN(value)) return { kind: 'NaN' }
  if (['string', 'number', 'boolean'].includes(typeof value)) return { kind: typeof value, value }
  if (typeof value === 'function') return { kind: 'function' }
  if (value instanceof Headers) return { kind: 'headers' }
  if (value instanceof URL) return { kind: 'url', href: value.href }
  if (value instanceof Error) return { kind: 'error', message: value.message }
  if (typeof value === 'object') {
    const inside = Object.entries(value).find(
      ([, v]) => v instanceof Promise || v instanceof Response || v instanceof Headers
    )
    if (inside) {
      const what =
        inside[1] instanceof Promise
          ? 'promise'
          : inside[1] instanceof Response
            ? 'response'
            : 'headers'
      return { kind: `${what}-inside`, key: inside[0] }
    }
    try {
      return {
        kind: Array.isArray(value) ? 'array' : 'object',
        value: JSON.parse(JSON.stringify(value))
      }
    } catch {
      return { kind: 'object' }
    }
  }
  return { kind: typeof value }
}

function shown(value) {
  if (value instanceof Response) return `the whole answer (a Response with status ${value.status})`
  if (value instanceof Error) return `${value.name}: ${value.message}`
  return inspect(value, { depth: 4, breakLength: 100 })
}

function startServer(routes, received) {
  const used = new Map()
  const server = createServer((req, res) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const url = new URL(req.url, 'http://check.example')
      const headerNames = []
      for (let i = 0; i < req.rawHeaders.length; i += 2) headerNames.push(req.rawHeaders[i])
      received.push({
        method: req.method,
        target: req.url,
        path: url.pathname,
        query: [...url.searchParams],
        headers: req.headers,
        headerNames,
        body: Buffer.concat(chunks).toString('utf8')
      })
      const route = routes.find(
        (r) =>
          r.path === url.pathname &&
          (!r.method || r.method === req.method) &&
          (!r.when || req.headers[r.when.header]?.toLowerCase() === r.when.value.toLowerCase())
      )
      let answer = { status: 404, body: 'Check has no page at this path.' }
      if (route) {
        const n = used.get(route) ?? 0
        used.set(route, n + 1)
        answer = route.answers[Math.min(n, route.answers.length - 1)]
      }
      const body = answer.body ?? ''
      const headers = { 'content-length': Buffer.byteLength(body), ...(answer.headers ?? {}) }
      if (answer.reason) res.writeHead(answer.status, answer.reason, headers)
      else res.writeHead(answer.status, headers)
      res.end(body)
    })
  })
  server.on('clientError', (err, socket) => {
    received.turnedAway = (received.turnedAway ?? 0) + 1
    socket.end('HTTP/1.1 400 Bad Request\r\ncontent-length: 0\r\n\r\n')
  })
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

const withBase = (value, base) =>
  typeof value === 'string'
    ? value.replaceAll('$base', base)
    : Array.isArray(value)
      ? value.map((v) => withBase(v, base))
      : value

/**
 * Calls `fn` from the learner's `file` with `args` ('$base' in a string becomes the server's
 * address) while a server answers `routes`: [{ method?, path, when?: { header, value }, answers:
 * [{ status, reason?, headers?, body? }] }], one answer per request in order, the last one
 * repeating. The first route that matches answers; `when` matches a header, ignoring capitals.
 */
export async function exchange({ file, fn, args = [], routes = [] }) {
  const received = []
  const server = await startServer(routes, received)
  const base = `http://127.0.0.1:${server.address().port}`
  const printed = []
  const log = console.log
  try {
    let mod
    try {
      mod = await import(pathToFileURL(join(process.cwd(), file)).href)
    } catch (err) {
      return { base, received, outcome: { kind: 'load', ...errorInfo(err) }, printed }
    }
    if (typeof mod[fn] !== 'function') {
      return { base, received, outcome: { kind: 'missing' }, printed }
    }
    console.log = (...parts) =>
      printed.push(parts.map((p) => (typeof p === 'string' ? p : inspect(p))).join(' '))
    let timer
    const outcome = await Promise.race([
      Promise.resolve()
        .then(() => mod[fn](...withBase(args, base)))
        .then(
          (value) => ({ kind: 'returned', value: describe(value), shown: shown(value) }),
          (err) => ({ kind: 'threw', ...errorInfo(err) })
        ),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve({ kind: 'timeout' }), CALL_TIMEOUT_MS)
      })
    ])
    clearTimeout(timer)
    // A request sent without waiting for it may still be on its way; give it a moment to land.
    await new Promise((resolve) => setTimeout(resolve, 50))
    // A loop that never stops can send thousands of requests; the first few say enough.
    return {
      base,
      received: received.slice(0, 20),
      receivedCount: received.length,
      turnedAway: received.turnedAway ?? 0,
      outcome,
      printed,
      unhandled
    }
  } finally {
    console.log = log
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
}
