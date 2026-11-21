import { createServer } from 'node:http'
import { readJson } from './body.js'
import { HttpError } from './errors.js'
import { fleet } from './fleet.js'
import { priceQuote, validateQuote } from './quote.js'
import { sendJson } from './respond.js'

const routes = {
  '/health': {
    GET: (req, res) => sendJson(res, 200, { status: 'ok' })
  },
  '/boats': {
    GET: (req, res) => sendJson(res, 200, fleet)
  },
  '/quotes': {
    POST: async (req, res) => {
      const input = await readJson(req)
      sendJson(res, 200, priceQuote(validateQuote(input)))
    }
  }
}

export async function handleRequest(req, res) {
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
  await handler(req, res)
}

export function createApp() {
  return createServer(async (req, res) => {
    try {
      await handleRequest(req, res)
    } catch (err) {
      if (err instanceof HttpError) {
        const { code, message, details } = err
        return sendJson(res, err.status, { error: { code, message, details } })
      }
      sendJson(res, 500, { error: { code: 'internal_error', message: err.message } })
    }
  })
}
