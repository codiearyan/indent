// Copied into the sandbox as .grader/drive.mjs. Drives the learner's router, server and order app
// with routes, requests and orders of its own. Every case makes a fresh router, and every server
// listens on a port the system picks and is closed before the case ends.
import { createServer, Server } from 'node:http'
import * as lib from '../src/router.js'
import { attempt, earlier, needs, send, shown, within } from './helpers.mjs'

const answer = (log, name) => (req, res) => {
  log.push(name)
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ route: name, params: req.params ?? null }))
}
const note = (log, name) => (req, res, next) => {
  log.push(name)
  next()
}

export function prefixCase() {
  const router = lib.createRouter()
  const group = lib.createRouter()
  return attempt(() => lib.mount(router, 'staff', group))
}

/** Builds a router and a group from a plan, mounts the group, and sends each request to a fresh pair. */
export async function groupCase(plan, requests) {
  const out = []
  for (const [method, url] of requests) {
    const log = []
    const thrown = new Error('The guillotine jammed')
    const seen = []
    const router = needs('createRouter(), addRoute() or use() do not work any more.', () => {
      const r = lib.createRouter()
      const g = lib.createRouter()
      for (const name of plan.use ?? []) lib.use(r, note(log, name))
      for (const name of plan.groupUse ?? []) lib.use(g, note(log, name))
      for (const [m, p] of plan.routes ?? []) lib.addRoute(r, m, p, answer(log, `${m} ${p}`))
      for (const [m, p, does] of plan.groupRoutes ?? []) {
        lib.addRoute(g, m, p, does === 'throw' ? () => { log.push(`group ${m} ${p}`); throw thrown } : answer(log, `group ${m} ${p}`))
      }
      if (plan.onError) {
        lib.onError(r, (error, req, res) => {
          seen.push(error === thrown)
          res.statusCode = 503
          res.end('handled')
        })
      }
      r.mountIt = () => lib.mount(r, plan.prefix, g)
      return r
    })
    router.mountIt()
    delete router.mountIt
    const { reply } = await send(lib.handle, router, method, url)
    out.push({ log, reply, seen })
  }
  return out
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  return `http://127.0.0.1:${server.address().port}`
}

async function close(server) {
  const closed = new Promise((resolve) => server.close(() => resolve(true)))
  server.closeAllConnections?.()
  return (await within(1000, closed)).value === true
}

async function ask(base, [method, path, { headers = {}, body } = {}]) {
  try {
    const res = await fetch(base + path, {
      method,
      headers,
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(1500)
    })
    const text = await res.text()
    let json
    try {
      json = JSON.parse(text)
    } catch {}
    return {
      request: `${method} ${path}`,
      answered: true,
      status: res.status,
      allow: res.headers.get('allow') ?? undefined,
      type: res.headers.get('content-type') ?? undefined,
      from: res.headers.get('x-from') ?? undefined,
      body: text,
      json
    }
  } catch (error) {
    const hung = error?.name === 'TimeoutError'
    return { request: `${method} ${path}`, answered: false, hung, threw: hung ? undefined : shown(error.cause ?? error) }
  }
}

const SERVE_PLANS = {
  real(log) {
    const r = lib.createRouter()
    lib.addRoute(r, 'GET', '/orders/:id', (req, res) => {
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ id: req.params?.id, query: { ...req.query } }))
    })
    lib.addRoute(r, 'POST', '/orders', (req, res) => {
      res.statusCode = 201
      res.end(JSON.stringify({ got: req.body }))
    })
    return [r, [
      ['GET', '/orders/5102?proof=yes'],
      ['POST', '/orders', { headers: { 'content-type': 'application/json' }, body: { item: 'card', quantity: 12 } }],
      ['GET', '/invoices'],
      ['DELETE', '/orders/5102']
    ]]
  },
  head(log) {
    const r = lib.createRouter()
    lib.addRoute(r, 'GET', '/prices', (req, res) => {
      log.push(`GET route for ${req.method}`)
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.end('{"card":30}')
    })
    lib.addRoute(r, 'GET', '/stock', (req, res) => {
      res.setHeader('x-from', 'get')
      res.end('stock')
    })
    lib.addRoute(r, 'HEAD', '/stock', (req, res) => {
      res.setHeader('x-from', 'head')
      res.end()
    })
    lib.addRoute(r, 'POST', '/orders', (req, res) => res.end('made'))
    return [r, [['HEAD', '/prices'], ['HEAD', '/stock'], ['HEAD', '/orders'], ['GET', '/prices']]]
  },
  broken() {
    // Not a router at all, so any handle() fails on it.
    return [{}, [['GET', '/prices'], ['GET', '/orders']]]
  },
  failing(log) {
    const r = lib.createRouter()
    lib.onError(r, () => {
      throw new Error('The error handler broke too')
    })
    lib.addRoute(r, 'GET', '/broken', () => {
      throw new Error('Ink ran out at the second press')
    })
    lib.addRoute(r, 'GET', '/prices', (req, res) => res.end('{"card":30}'))
    return [r, [['GET', '/broken'], ['GET', '/prices']]]
  }
}

export async function serveCase(kind, needsHead = false) {
  const log = []
  const [router, requests] = needs('createRouter(), addRoute() or onError() do not work any more.', () => SERVE_PLANS[kind](log))
  const server = lib.serve(router)
  const isServer = server instanceof Server
  if (!isServer) return { isServer, got: shown(server) }
  const listeningAtFirst = server.listening
  let base
  try {
    base = await listen(server)
  } catch (error) {
    server.close()
    return { isServer, listeningAtFirst, listenError: shown(error) }
  }
  try {
    const replies = []
    for (const request of requests) replies.push(await ask(base, request))
    return { isServer, listeningAtFirst, replies, log, closed: await close(server) }
  } finally {
    if (server.listening) server.close()
  }
}

// The check's own orders, so no answer can be copied from the shop's.
const ORDERS = [
  { id: '5101', item: 'poster', quantity: 60, status: 'waiting', due: '2027-03-02' },
  { id: '5102', item: 'card', quantity: 300, status: 'printing', due: '2027-03-05' },
  { id: '5103', item: 'invite', quantity: 90, status: 'waiting', due: '2027-03-02' },
  { id: '5104', item: 'card', quantity: 40, status: 'ready', due: '2027-03-09' },
  { id: '5105', item: 'card', quantity: 150, status: 'waiting', due: '2027-03-11' }
]
const KEY = 'press-room-7'

/** Runs the learner's createApp() on a server of the check's own, so this task depends only on handle(). */
export async function appCase(requests) {
  const { createApp } = await import('../src/app.js')
  const { createShop } = await import('../src/shop.js')
  const probe = needs('This task needs mount() from task 1, which does not work yet.', () => {
    const r = lib.createRouter()
    const g = lib.createRouter()
    lib.addRoute(g, 'GET', '/x', (req, res) => res.end('x'))
    lib.mount(r, '/y', g)
    return r
  })
  const p = await send(lib.handle, probe, 'GET', '/y/x')
  if (p.reply.body !== 'x') earlier('This task needs mount() from task 1: a group route does not answer under its prefix yet.')
  const app = createApp(createShop({ today: '2027-03-02', orders: ORDERS }), { staffKey: KEY })
  const server = createServer((req, res) => {
    Promise.resolve(lib.handle(app, req, res)).catch(() => {
      if (!res.headersSent) res.writeHead(500).end('handle() threw')
    })
  })
  const base = await listen(server)
  try {
    const replies = []
    for (const [method, path, options = {}] of requests) {
      const headers = { ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}) }
      if (options.key === 'right') headers['x-staff-key'] = KEY
      if (options.key === 'wrong') headers['x-staff-key'] = 'press-room-8'
      replies.push(await ask(base, [method, path, { headers, body: options.body }]))
    }
    return { replies, closed: await close(server) }
  } finally {
    if (server.listening) server.close()
  }
}
