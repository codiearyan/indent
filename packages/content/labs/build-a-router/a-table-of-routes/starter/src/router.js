// Ashgrove's own router. Nothing but plain JavaScript and Node.
//
// Task 1: Keep a table of routes (createRouter, addRoute, handle)
// Task 2: Say when there is no route (handle)
// Task 3: Say which methods a path takes (handle)
import { sendJson } from './send.js'

// Task 1
// createRouter() returns a new router with no routes. Two routers never share their routes.
export function createRouter() {
  throw new Error('Not implemented')
}

// Task 1
// addRoute(router, method, path, handler) keeps a route: requests with this method ('GET', 'POST')
// and exactly this path go to handler(req, res).
// It throws a TypeError when path is not a string that starts with '/' or handler is not a
// function, and an Error when the router already has a route for this method and path.
export function addRoute(router, method, path, handler) {
  throw new Error('Not implemented')
}

// Tasks 1, 2 and 3
// handle(router, req, res) finds the route for req.method and req.url and calls its handler with
// req and res. For now req.url is only a path, such as '/orders/today'.
// Task 2: no route for the path at all: answer 404 with { error } that names the method and path.
// Task 3: the path has routes, but not for this method: answer 405 with an `allow` header that lists
// the methods the path takes, such as 'GET, POST', and { error } that names the method and path.
export async function handle(router, req, res) {
  throw new Error('Not implemented')
}
