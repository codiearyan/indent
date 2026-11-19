// Task: Serve the list
//
// GET /boats reads its query string with parseListQuery and answers 200 with
// applyListQuery(store.list(), query): { data, total, limit, offset }.
// Bad parameters answer 400 invalid_query (parseListQuery throws the HttpError for you).
import { createServer } from 'node:http'
import { readJson } from './body.js'
import { validateBoat } from './boats.js'
import { HttpError } from './errors.js'
import { fleet } from './fleet.js'
import { applyListQuery, parseListQuery } from './listQuery.js'
import { priceQuote, validateQuote } from './quote.js'
import { sendJson } from './respond.js'
import { createBoatStore } from './store.js'

function listBoats(req, res, { store }) {
  throw new Error('Not implemented')
}

function boatNotFound(code) {
  return new HttpError(404, 'not_found', `No boat with code ${code}`)
}

function getBoat(req, res, { store, params }) {
  const boat = store.get(params.code)
  if (!boat) throw boatNotFound(params.code)
  sendJson(res, 200, boat)
}

async function createBoat(req, res, { store }) {
  const boat = store.create(validateBoat(await readJson(req)))
  res.setHeader('location', `/boats/${boat.code}`)
  sendJson(res, 201, boat)
}

async function updateBoat(req, res, { store, params }) {
  const changes = validateBoat(await readJson(req), { partial: true })
  const boat = store.update(params.code, changes)
  if (!boat) throw boatNotFound(params.code)
  sendJson(res, 200, boat)
}

function deleteBoat(req, res, { store, params }) {
  if (!store.remove(params.code)) throw boatNotFound(params.code)
  res.writeHead(204)
  res.end()
}

async function createQuote(req, res) {
  const input = await readJson(req)
  sendJson(res, 200, priceQuote(validateQuote(input)))
}

const routes = [
  { path: '/health', methods: { GET: (req, res) => sendJson(res, 200, { status: 'ok' }) } },
  { path: '/quotes', methods: { POST: createQuote } },
  { path: '/boats', methods: { GET: listBoats, POST: createBoat } },
  { path: '/boats/:code', methods: { GET: getBoat, PATCH: updateBoat, DELETE: deleteBoat } }
]

// Returns the :params of `pattern` when `pathname` matches it, otherwise null.
function matchPath(pattern, pathname) {
  const want = pattern.split('/')
  const got = pathname.split('/')
  if (want.length !== got.length) return null
  const params = {}
  for (let i = 0; i < want.length; i++) {
    if (want[i].startsWith(':')) params[want[i].slice(1)] = got[i]
    else if (want[i] !== got[i]) return null
  }
  return params
}

export async function handleRequest(req, res, store) {
  const { pathname } = new URL(req.url, 'http://localhost')
  for (const route of routes) {
    const params = matchPath(route.path, pathname)
    if (!params) continue
    const handler = route.methods[req.method]
    if (!handler) {
      const allowed = Object.keys(route.methods).join(', ')
      res.setHeader('allow', allowed)
      return sendJson(res, 405, {
        error: { code: 'method_not_allowed', message: `${pathname} accepts ${allowed}` }
      })
    }
    return handler(req, res, { store, params })
  }
  sendJson(res, 404, { error: { code: 'not_found', message: `Nothing lives at ${pathname}` } })
}

export function createApp({ boats = fleet } = {}) {
  const store = createBoatStore(boats)
  return createServer(async (req, res) => {
    try {
      await handleRequest(req, res, store)
    } catch (err) {
      if (err instanceof HttpError) {
        const { code, message, details } = err
        return sendJson(res, err.status, { error: { code, message, details } })
      }
      sendJson(res, 500, { error: { code: 'internal_error', message: err.message } })
    }
  })
}
