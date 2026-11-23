// Copied into every sandbox as .grader/helpers.mjs. Tools the issue drivers share.
// Requests and responses here have the shape a Node server hands over, so the learner's router
// meets the same objects in a check as on a real server.
import { Readable } from 'node:stream'
import { inspect } from 'node:util'

export const shown = (value) =>
  value instanceof Error ? `${value.name}: ${value.message}` : inspect(value, { depth: 3, breakLength: Infinity })

// A throw that escaped the learner's code into a timer or a promise nobody waited for. Kept, not fatal.
export const escaped = []
process.on('uncaughtException', (error) => escaped.push(shown(error)))
process.on('unhandledRejection', (error) => escaped.push(shown(error)))

function needsError(message) {
  const error = new Error(message)
  error.name = 'NeedsEarlierTask'
  return error
}

export function earlier(message) {
  throw needsError(message)
}

/** Stops the case with a plain sentence about an earlier task when `fn` throws. */
export function needs(message, fn) {
  try {
    return fn()
  } catch (error) {
    throw needsError(`${message} It threw ${shown(error)}.`)
  }
}

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
export const never = () => new Promise(() => {})

/** Resolves with what `promise` gave, or with `{ hung: true }` after `ms`. */
export function within(ms, promise) {
  let timer
  const limit = new Promise((resolve) => (timer = setTimeout(() => resolve({ hung: true }), ms)))
  return Promise.race([Promise.resolve(promise).then((value) => ({ value })), limit]).finally(() =>
    clearTimeout(timer)
  )
}

/** Calls fn and says whether it threw, without letting the throw stop the case. */
export function attempt(fn) {
  try {
    return { threw: false, value: fn() }
  } catch (error) {
    return { threw: true, typeError: error instanceof TypeError, error: shown(error) }
  }
}

/**
 * A request like the one a Node server hands over: a readable stream of the body with method, url
 * and headers on it. `pulled` counts the chunks read so far; with `hold` the body never ends, like
 * a client that is still sending.
 */
export function fakeRequest(method, url, { headers = {}, chunks = [], hold = false } = {}) {
  let next = 0
  const req = new Readable({
    highWaterMark: 1,
    read() {
      if (next < chunks.length) {
        req.pulled = next + 1
        this.push(Buffer.from(chunks[next++]))
      } else if (!hold) {
        this.push(null)
      }
    }
  })
  req.pulled = 0
  req.method = method
  req.url = url
  req.headers = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  return req
}

/** A response with the parts of a Node response a router uses. */
export function fakeResponse() {
  const headers = {}
  let written = ''
  const sent = () => {
    const error = new Error('Cannot set headers after they are sent to the client')
    error.code = 'ERR_HTTP_HEADERS_SENT'
    return error
  }
  const res = {
    statusCode: 200,
    headersSent: false,
    writableEnded: false,
    body: undefined,
    ends: 0,
    setHeader(name, value) {
      if (res.headersSent) throw sent()
      headers[String(name).toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value)
      return res
    },
    getHeader: (name) => headers[String(name).toLowerCase()],
    getHeaders: () => ({ ...headers }),
    hasHeader: (name) => String(name).toLowerCase() in headers,
    removeHeader(name) {
      delete headers[String(name).toLowerCase()]
    },
    writeHead(status, ...rest) {
      if (res.headersSent) throw sent()
      res.statusCode = status
      const more = rest.find((x) => x && typeof x === 'object')
      for (const [k, v] of Object.entries(more ?? {})) res.setHeader(k, v)
      res.headersSent = true
      return res
    },
    write(chunk) {
      res.headersSent = true
      written += String(chunk)
      return true
    },
    end(chunk) {
      res.ends += 1
      if (res.writableEnded) return res
      if (chunk !== undefined && typeof chunk !== 'function') written += String(chunk)
      res.writableEnded = true
      res.headersSent = true
      res.body = written
      return res
    }
  }
  return res
}

const parse = (body) => {
  try {
    return JSON.parse(body)
  } catch {
    return undefined
  }
}

/**
 * Sends one request through `handle(router, req, res)` and says what came back. A handle() that
 * has not finished nor answered after `ms` is reported as hung instead of waited on.
 */
export async function send(handle, router, method, url, { ms = 1500, ...options } = {}) {
  const req = fakeRequest(method, url, options)
  const res = fakeResponse()
  let threw
  const run = (async () => handle(router, req, res))().catch((error) => {
    threw = shown(error)
  })
  const outcome = await within(ms, run)
  return {
    req,
    res,
    reply: {
      request: `${method} ${url}`,
      answered: res.writableEnded,
      status: res.writableEnded ? res.statusCode : undefined,
      allow: res.getHeader('allow'),
      type: res.getHeader('content-type'),
      body: res.body,
      json: res.writableEnded ? parse(res.body) : undefined,
      ends: res.ends,
      hung: Boolean(outcome.hung) && !res.writableEnded,
      threw,
      pulled: req.pulled
    }
  }
}
