// Copied into the sandbox as .grader/drive.mjs. Drives the learner's router with routes and
// requests of its own. Every case makes a fresh router.
import * as lib from '../src/router.js'
import { attempt, earlier, needs, send } from './helpers.mjs'

// A router with the given routes; each handler notes that it ran and answers with its own name.
// In task 1 a throw is the learner's own; later tasks say it is task 1's.
function build(routes, own = false) {
  const calls = []
  const seen = []
  const make = () => {
    const r = lib.createRouter()
    for (const [method, path] of routes) {
      lib.addRoute(r, method, path, (req, res) => {
        calls.push(`${method} ${path}`)
        seen.push({ req, res })
        res.statusCode = 200
        res.end(`${method} ${path}`)
      })
    }
    return r
  }
  const router = own ? make() : needs('This task needs createRouter() and addRoute() from task 1, which do not work yet.', make)
  return { router, calls, seen }
}

const ask = (router, method, url) => send(lib.handle, router, method, url)

// Later tasks first make sure a request for a route reaches it, so they can say so plainly.
async function probe(router, calls, [method, path]) {
  const { reply } = await ask(router, method, path)
  if (calls.at(-1) !== `${method} ${path}`) {
    earlier('This task needs task 1 first: handle() does not call the handler of a route that matches yet.')
  }
  calls.length = 0
  return reply
}

export async function matchCase(kind) {
  if (kind === 'one') {
    const { router, calls, seen } = build([['GET', '/prices'], ['GET', '/orders'], ['GET', '/orders/today']], true)
    const { req, res, reply } = await ask(router, 'GET', '/orders')
    return { calls, reply, same: seen.length === 1 && seen[0].req === req && seen[0].res === res }
  }
  if (kind === 'methods') {
    const { router, calls } = build([['GET', '/orders'], ['POST', '/orders']], true)
    const first = await ask(router, 'POST', '/orders')
    const afterPost = [...calls]
    const second = await ask(router, 'GET', '/orders')
    return { afterPost, calls, replies: [first.reply, second.reply] }
  }
  // Two routers, each with one route: neither may answer with the other's.
  const a = build([['GET', '/prices']], true)
  const b = build([['GET', '/orders']], true)
  const fromB = await ask(b.router, 'GET', '/prices')
  const fromA = await ask(a.router, 'GET', '/orders')
  const own = await ask(a.router, 'GET', '/prices')
  return { aCalls: a.calls, bCalls: b.calls, replies: [fromB.reply, fromA.reply, own.reply] }
}

export async function addCase(kind) {
  const router = lib.createRouter()
  const fn = (req, res) => res.end('first')
  if (kind === 'noSlash') return attempt(() => lib.addRoute(router, 'GET', 'orders', fn))
  if (kind === 'notString') return attempt(() => lib.addRoute(router, 'GET', 42, fn))
  if (kind === 'notFn') return attempt(() => lib.addRoute(router, 'GET', '/orders', 'list orders'))
  const first = attempt(() => lib.addRoute(router, 'GET', '/orders', fn))
  const second = attempt(() => lib.addRoute(router, 'GET', '/orders', (req, res) => res.end('second')))
  const { reply } = await ask(router, 'GET', '/orders')
  return { first, second, reply }
}

const MISSING = {
  unknown: [[['GET', '/prices']], 'GET', '/invoices'],
  post: [[['GET', '/prices']], 'POST', '/stock'],
  prefix: [[['GET', '/orders'], ['GET', '/prices']], 'GET', '/orders/1873'],
  longer: [[['GET', '/orders/today'], ['GET', '/prices']], 'GET', '/orders'],
  case: [[['GET', '/orders/today'], ['GET', '/prices']], 'GET', '/Orders/Today'],
  empty: [[], 'GET', '/']
}

export async function missingCase(kind) {
  const [routes, method, url] = MISSING[kind]
  const { router, calls } = build(routes)
  if (routes.length) await probe(router, calls, routes.at(-1))
  const { reply } = await ask(router, method, url)
  return { calls, reply, method, url }
}

const WRONG = {
  two: [[['GET', '/orders'], ['POST', '/orders']], 'DELETE', '/orders'],
  order: [[['POST', '/prices'], ['GET', '/prices']], 'PUT', '/prices'],
  one: [[['GET', '/orders/today']], 'POST', '/orders/today'],
  others: [[['GET', '/orders'], ['DELETE', '/prices'], ['POST', '/orders']], 'PATCH', '/orders']
}

export async function methodCase(kind) {
  const [routes, method, url] = WRONG[kind]
  const { router, calls } = build(routes)
  await probe(router, calls, routes[0])
  const { reply } = await ask(router, method, url)
  return { calls, reply, method, url }
}
