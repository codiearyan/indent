// Ashgrove's own router. Nothing but plain JavaScript and Node.
//
// Task 1: Match a path to a pattern (matchPath)
// Task 2: Hand the values to the handler (handle)
// Task 3: Choose when two routes match (handle)
import { sendJson } from './send.js'

export function createRouter() {
  return { routes: [] }
}

// A route's path may now be a pattern, such as '/orders/:id'.
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

// Task 1
// matchPath(pattern, path) says whether a path fits a pattern such as '/orders/:id'.
// It returns an object with the value of every part that varies, as written in the path:
// matchPath('/orders/:id', '/orders/1873') is { id: '1873' }. It returns {} for a pattern with no
// parts that vary, and null when the path does not fit: the same number of parts, fixed parts
// exactly the same, and each part that varies is one whole part that is not empty.
export function matchPath(pattern, path) {
  throw new Error('Not implemented')
}

// Task 2: match every route with matchPath(). Give the handler req.params, the values with
// %-codes decoded. A value that cannot be decoded is answered 400 with { error }, and no handler runs.
// 404 and 405 work as before, now for patterns too.
// Task 3: when several routes of the request's method match, the one with the most fixed parts
// wins, whatever the order they were added in. With the same number, the one added first wins.
export async function handle(router, req, res) {
  const onPath = router.routes.filter((route) => route.path === req.url)
  const route = onPath.find((r) => r.method === req.method)
  if (route) return route.handler(req, res)
  if (onPath.length === 0) {
    return sendJson(res, 404, { error: `There is no route for ${req.method} ${req.url}.` })
  }
  const allow = onPath.map((r) => r.method).join(', ')
  res.setHeader('allow', allow)
  sendJson(res, 405, { error: `${req.url} does not take ${req.method}. It takes ${allow}.` })
}
