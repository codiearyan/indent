// Tasks: Answer the first routes, Say no clearly
//
// handleRequest(req, res) answers every request:
// - GET /health answers 200 with { status: 'ok' }
// - GET /boats answers 200 with the fleet array from fleet.js
// - a path with no route answers 404 with { error: { code: 'not_found', message } }
// - a known path with the wrong method answers 405 with an `allow` header listing the methods
//   it does accept and { error: { code: 'method_not_allowed', message } }
// The query string is not part of the path.
import { createServer } from 'node:http'
import { fleet } from './fleet.js'
import { sendJson } from './respond.js'

const routes = {
  '/health': {
    GET: (req, res) => sendJson(res, 200, { status: 'ok' })
  },
  '/boats': {
    GET: (req, res) => sendJson(res, 200, fleet)
  }
}

export function handleRequest(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost')
  const route = routes[pathname]
  if (!route) {
    return sendJson(res, 404, { error: { code: 'not_found', message: `Nothing lives at ${pathname}` } })
  }
  const handler = route[req.method]
  if (!handler) {
    const allowed = Object.keys(route).join(', ')
    res.setHeader('allow', allowed)
    return sendJson(res, 405, {
      error: { code: 'method_not_allowed', message: `${pathname} accepts ${allowed}` }
    })
  }
  handler(req, res)
}

export function createApp() {
  return createServer((req, res) => {
    try {
      handleRequest(req, res)
    } catch (err) {
      res.statusCode = 500
      res.end(`Server error: ${err.message}\n`)
    }
  })
}
