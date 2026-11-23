// Ashgrove's own router. Nothing but plain JavaScript and Node.
//
// Task 1: Keep a table of routes (createRouter, addRoute, handle)
// Task 2: Say when there is no route (handle)
// Task 3: Say which methods a path takes (handle)
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
