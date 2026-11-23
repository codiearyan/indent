// Ashgrove's own router. Nothing but plain JavaScript and Node.
//
// Task 1: Read the query string (parseQuery, handle)
// Task 2: Read a JSON body (handle)
// Task 3: Refuse a body that is too large (createRouter, handle)
import { sendJson } from './send.js'

export function createRouter({ bodyLimit = 100000 } = {}) {
  return { routes: [], bodyLimit }
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

const fixedParts = (pattern) => pattern.split('/').filter((part) => !part.startsWith(':')).length

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
  return best.route.handler(req, res)
}
