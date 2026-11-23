// Ashgrove's own router. Nothing but plain JavaScript and Node.
//
// Task 1: Group routes under a prefix (mount)
// Task 2: Serve real requests (serve, handle)
// Task 3: Move the order server onto your router (src/app.js)
import { createServer } from 'node:http'
import { sendJson } from './send.js'

export function createRouter({ bodyLimit = 100000 } = {}) {
  return { routes: [], middleware: [], errorHandler: undefined, bodyLimit }
}

export function addRoute(router, method, path, handler) {
  if (typeof path !== 'string' || !path.startsWith('/')) {
    throw new TypeError(`A route's path starts with /, but got ${path}`)
  }
  if (typeof handler !== 'function') throw new TypeError(`The route ${method} ${path} needs a function`)
  if (router.routes.some((route) => route.method === method && route.path === path)) {
    throw new Error(`There is already a route for ${method} ${path}`)
  }
  router.routes.push({ method, path, handler })
}

export function use(router, fn) {
  if (typeof fn !== 'function') throw new TypeError('A middleware is a function')
  router.middleware.push(fn)
}

export function onError(router, fn) {
  router.errorHandler = fn
}

// Task 1
// mount(router, prefix, group) puts every route of another router, the group, under a prefix:
// mount(router, '/staff', staff) makes staff's GET /queue answer GET /staff/queue, and its '/'
// answer /staff itself. The group's middleware runs after the router's own, only for the group's
// routes. Errors go to the router's error handler. Mount a group once its routes and middleware
// are added. It throws a TypeError when prefix is not a string that starts with '/'.
export function mount(router, prefix, group) {
  throw new Error('Not implemented')
}

// Task 2
// serve(router) returns a server from node:http, not listening yet, that sends every request
// through handle(). If handle() fails before anything was answered, the client gets a plain 500.
export function serve(router) {
  throw new Error('Not implemented')
}

export function matchPath(pattern, path) {
  const wanted = pattern.split('/')
  const parts = path.split('/')
  if (wanted.length !== parts.length) return null
  const values = {}
  for (let i = 0; i < wanted.length; i++) {
    if (wanted[i].startsWith(':')) {
      if (parts[i] === '') return null
      values[wanted[i].slice(1)] = parts[i]
    } else if (wanted[i] !== parts[i]) {
      return null
    }
  }
  return values
}

function decodePart(text) {
  const spaced = text.replaceAll('+', ' ')
  try {
    return decodeURIComponent(spaced)
  } catch {
    return spaced
  }
}

export function parseQuery(search) {
  const query = Object.create(null)
  for (const pair of search.split('&')) {
    if (pair === '') continue
    const at = pair.indexOf('=')
    const key = decodePart(at === -1 ? pair : pair.slice(0, at))
    const value = at === -1 ? '' : decodePart(pair.slice(at + 1))
    if (!(key in query)) query[key] = value
    else if (Array.isArray(query[key])) query[key].push(value)
    else query[key] = [query[key], value]
  }
  return query
}

const isJson = (req) =>
  String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase() === 'application/json'

// Stops at the first byte past the limit, so a huge body is never held in memory.
async function readBody(req, limit) {
  if (Number(req.headers['content-length']) > limit) return { tooLarge: true }
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) return { tooLarge: true }
    chunks.push(chunk)
  }
  return { text: Buffer.concat(chunks).toString('utf8') }
}

class Unanswered extends Error {}

// Runs step i of the chain. next() starts the rest once, and its promise settles when the rest has.
async function runStep(chain, i, req, res) {
  const { fn, name } = chain[i]
  let rest
  const next = (error) => {
    if (rest) return rest
    if (error != null) rest = Promise.reject(error)
    else if (i + 1 < chain.length) rest = runStep(chain, i + 1, req, res)
    else rest = Promise.resolve()
    rest.catch(() => {})
    return rest
  }
  await fn(req, res, next)
  if (rest) return rest
  if (!res.writableEnded) {
    const or = i < chain.length - 1 ? ' or calling next' : ''
    throw new Unanswered(`${name} finished without answering${or}.`)
  }
}

async function answerError(router, error, req, res) {
  if (router.errorHandler) {
    try {
      await router.errorHandler(error, req, res)
    } catch {
      // The error handler failed too; the plain 500 below still answers.
    }
  }
  if (!res.headersSent) sendJson(res, 500, { error: 'Something went wrong on our side.' })
}

const fixedParts = (pattern) => pattern.split('/').filter((part) => !part.startsWith(':')).length

// Task 2: a HEAD request is answered by the path's HEAD route, or else by its GET route.
export async function handle(router, req, res) {
  const at = req.url.indexOf('?')
  const path = at === -1 ? req.url : req.url.slice(0, at)
  const matches = []
  for (const route of router.routes) {
    const values = matchPath(route.path, path)
    if (values) matches.push({ route, values })
  }
  if (matches.length === 0) {
    return sendJson(res, 404, { error: `There is no route for ${req.method} ${path}.` })
  }
  const mine = matches.filter((match) => match.route.method === req.method)
  if (mine.length === 0) {
    const allow = [...new Set(matches.map((match) => match.route.method))].join(', ')
    res.setHeader('allow', allow)
    return sendJson(res, 405, { error: `${path} does not take ${req.method}. It takes ${allow}.` })
  }
  let best = mine[0]
  for (const match of mine) {
    if (fixedParts(match.route.path) > fixedParts(best.route.path)) best = match
  }
  try {
    req.params = Object.fromEntries(
      Object.entries(best.values).map(([name, value]) => [name, decodeURIComponent(value)])
    )
  } catch {
    return sendJson(res, 400, { error: `Part of the path ${path} cannot be read.` })
  }
  req.query = parseQuery(at === -1 ? '' : req.url.slice(at + 1))
  if (isJson(req)) {
    const body = await readBody(req, router.bodyLimit)
    if (body.tooLarge) {
      return sendJson(res, 413, { error: `The body is larger than ${router.bodyLimit} bytes.` })
    }
    if (body.text !== '') {
      try {
        req.body = JSON.parse(body.text)
      } catch {
        return sendJson(res, 400, { error: 'The body is not valid JSON.' })
      }
    }
  }
  const chain = router.middleware.map((fn, i) => ({ fn, name: `Middleware ${i + 1}` }))
  chain.push({ fn: best.route.handler, name: `The handler for ${best.route.method} ${best.route.path}` })
  try {
    await runStep(chain, 0, req, res)
  } catch (error) {
    if (error instanceof Unanswered) return sendJson(res, 500, { error: error.message })
    await answerError(router, error, req, res)
  }
}
