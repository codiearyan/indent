// Ashgrove's own router. Nothing but plain JavaScript and Node.
//
// Task 1: Match a path to a pattern (matchPath)
// Task 2: Hand the values to the handler (handle)
// Task 3: Choose when two routes match (handle)
import { sendJson } from './send.js'

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

const fixedParts = (pattern) => pattern.split('/').filter((part) => !part.startsWith(':')).length

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
