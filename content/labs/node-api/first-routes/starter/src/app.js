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

export function handleRequest(req, res) {
  throw new Error('Not implemented')
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
