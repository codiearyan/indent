// Ashgrove's own router. Nothing but plain JavaScript and Node.
//
// Task 1: Read the query string (parseQuery, handle)
// Task 2: Read a JSON body (handle)
// Task 3: Refuse a body that is too large (createRouter, handle)
import { sendJson } from './send.js'

// Task 3: createRouter({ bodyLimit }) keeps the most bytes a body may have; without it, 100000.
export function createRouter() {
  return { routes: [] }
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

// Task 1
// parseQuery(search) turns the text after the ? into an object: 'status=waiting&item=card' gives
// { status: 'waiting', item: 'card' }.
// - pairs are separated by &, and empty pairs are skipped
// - a key and its value are split at the first =; a key with no = has the value ''
// - + is a space, and %-codes are decoded; a broken %-code, such as the % in 50%, is kept as written
// - a key that comes more than once gives an array of its values, in order
// - every key is a key of its own, even 'constructor' or '__proto__'
export function parseQuery(search) {
  throw new Error('Not implemented')
}

const fixedParts = (pattern) => pattern.split('/').filter((part) => !part.startsWith(':')).length

// Task 1: req.url may now end in ?query. Match routes on the path before the ?, and give the
// handler req.query, from parseQuery().
// Task 2: when the content-type is JSON, read the whole body before the handler runs and give the
// handler req.body, the parsed value. An empty body leaves req.body undefined; broken JSON is
// answered 400 with { error }. Other bodies are not read.
// Task 3: a body bigger than the router's bodyLimit, in bytes, is answered 413 with { error },
// as soon as that is known.
// Only a request that reaches a handler has its body read.
export async function handle(router, req, res) {
  const matches = []
  for (const route of router.routes) {
    const values = matchPath(route.path, req.url)
    if (values) matches.push({ route, values })
  }
  if (matches.length === 0) {
    return sendJson(res, 404, { error: `There is no route for ${req.method} ${req.url}.` })
  }
  const mine = matches.filter((match) => match.route.method === req.method)
  if (mine.length === 0) {
    const allow = [...new Set(matches.map((match) => match.route.method))].join(', ')
    res.setHeader('allow', allow)
    return sendJson(res, 405, { error: `${req.url} does not take ${req.method}. It takes ${allow}.` })
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
    return sendJson(res, 400, { error: `Part of the path ${req.url} cannot be read.` })
  }
  return best.route.handler(req, res)
}
