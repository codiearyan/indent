// Copied into the sandbox as .grader/drive.mjs. Drives the learner's router with queries and
// bodies of its own. Every case makes a fresh router.
import * as lib from '../src/router.js'
import { earlier, needs, send, shown } from './helpers.mjs'

/** What parseQuery gave, as JSON: every own key with its value, and what kind of thing it is. */
export function queryCase(search) {
  const q = lib.parseQuery(search)
  if (q === null || typeof q !== 'object') return { kind: shown(q) }
  return {
    kind: Array.isArray(q) ? 'an array' : q instanceof Map || q instanceof URLSearchParams ? q.constructor.name : 'object',
    own: Object.getOwnPropertyNames(q).sort().map((key) => [key, q[key]])
  }
}

const json = { 'content-type': 'application/json' }

// A router with one route per entry; each handler notes what it found on the request.
function build(routes, options) {
  const calls = []
  const router = needs('createRouter() and addRoute() do not work any more.', () => {
    const r = options ? lib.createRouter(options) : lib.createRouter()
    for (const [method, path] of routes) {
      lib.addRoute(r, method, path, (req, res) => {
        const body = req.body
        calls.push({
          route: `${method} ${path}`,
          params: req.params ?? null,
          query: req.query === undefined ? 'undefined' : { kind: Object.getPrototypeOf(req.query) === null ? 'object' : typeof req.query, own: req.query && Object.getOwnPropertyNames(req.query).sort().map((k) => [k, req.query[k]]) },
          body: body === undefined ? 'undefined' : body
        })
        res.end('done')
      })
    }
    return r
  })
  return { router, calls }
}

// A throw of 'Not implemented' from handle() comes from parseQuery() when it is wired in early.
function blame(reply) {
  if (reply.threw?.includes('Not implemented')) {
    earlier('handle() calls parseQuery() from task 1, which still throws Not implemented.')
  }
}

export async function routeQueryCase(routes, method, url) {
  const { router, calls } = build(routes)
  const { reply } = await send(lib.handle, router, method, url)
  return { calls, reply }
}

const CHUNKS = {
  // {"note":"crème"} with the two bytes of è in different chunks.
  split: [[123, 34, 110, 111, 116, 101, 34, 58, 34, 99, 114, 195], [168, 109, 101, 34, 125]],
  many: ['{"item":', '"poster",', '"quantity"', ':30,"due":"2026-12-04"}'],
  array: ['[1,2,', '3]'],
  broken: ['{"item":"card",'],
  empty: [],
  text: ['item=card&quantity=4']
}

export async function bodyCase(kind, type = 'application/json') {
  const { router, calls } = build([['POST', '/orders'], ['GET', '/prices']])
  const { reply } = await send(lib.handle, router, 'POST', '/orders', { headers: { 'content-type': type }, chunks: CHUNKS[kind] })
  blame(reply)
  return { calls, reply }
}

export async function bodyNotReadCase() {
  const { router, calls } = build([['POST', '/orders']])
  const notFound = await send(lib.handle, router, 'POST', '/invoices', { headers: json, chunks: ['{"a":1}'] })
  const wrongMethod = await send(lib.handle, router, 'PUT', '/orders', { headers: json, chunks: ['{"a":1}'] })
  blame(notFound.reply)
  return { calls, replies: [notFound.reply, wrongMethod.reply] }
}

const bytes = (n, ch = 'a') => [`"${ch.repeat(n - 2)}"`]

// limit: the router's bodyLimit, or null for none. body: { size } in bytes, or a plan below.
export async function limitCase(limit, plan) {
  // Task 2 first: a small JSON body has to reach the handler.
  const probe = build([['POST', '/orders']], limit === null ? undefined : { bodyLimit: limit })
  const p = await send(lib.handle, probe.router, 'POST', '/orders', { headers: json, chunks: ['{"a":1}'] })
  blame(p.reply)
  if (probe.calls[0]?.body?.a !== 1) {
    earlier('This task needs task 2 first: a small JSON body does not reach the handler as req.body yet.')
  }
  const { router, calls } = build([['POST', '/orders']], limit === null ? undefined : { bodyLimit: limit })
  const headers = { ...json, ...(plan.length ? { 'content-length': String(plan.length) } : {}) }
  let chunks
  if (plan.size) chunks = bytes(plan.size, plan.ch)
  if (plan.pieces) chunks = Array.from({ length: plan.pieces }, () => 'x'.repeat(plan.each))
  const { reply } = await send(lib.handle, router, 'POST', '/orders', { headers, chunks, hold: plan.hold, ms: 1500 })
  return { calls: calls.map((c) => ({ route: c.route, bodyLength: c.body === undefined ? c.body : Buffer.byteLength(JSON.stringify(c.body)) })), reply }
}
