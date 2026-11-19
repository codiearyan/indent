// Copied into a check sandbox as .grader/harness.mjs. Every server it starts listens on port 0
// and is always closed, so a check never leaves a process or a port behind.
import { createServer } from 'node:http'

const TIMEOUT_MS = 3000

async function send(base, { method = 'GET', path, headers = {}, body, json }) {
  const init = { method, headers: { ...headers }, signal: AbortSignal.timeout(TIMEOUT_MS) }
  if (json !== undefined) {
    init.body = JSON.stringify(json)
    init.headers['content-type'] = 'application/json'
  } else if (body !== undefined) {
    init.body = body
  }
  try {
    const res = await fetch(base + path, init)
    const text = await res.text()
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {}
    return { status: res.status, headers: Object.fromEntries(res.headers), text, json: parsed }
  } catch (err) {
    return {
      error:
        err.name === 'TimeoutError'
          ? `No response within ${TIMEOUT_MS / 1000} seconds`
          : `The connection failed: ${err.cause?.message ?? err.message}`
    }
  }
}

async function exchange(server, requests) {
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    const responses = []
    for (const request of requests) responses.push(await send(base, request))
    return responses
  } finally {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
}

async function appOptions(options, log) {
  const out = {}
  if (options.boats) out.boats = options.boats
  if (options.tokens) out.tokens = new Map(options.tokens)
  if (options.captureLog) out.log = (...args) => log.push(args.map(describe).join(' '))
  if (options.brokenList) {
    const { createBoatStore } = await import('../src/store.js')
    const store = createBoatStore(options.boats ?? [])
    store.list = () => {
      throw new Error(options.brokenList)
    }
    out.store = store
  }
  return out
}

function describe(value) {
  return value instanceof Error ? `${value.name}: ${value.message}` : String(value)
}

/** Starts the learner's app with createApp(options) and sends `requests` in order. */
export async function app(requests, options = {}) {
  const { createApp } = await import('../src/app.js')
  const log = []
  const server = createApp(await appOptions(options, log))
  if (!server || typeof server.listen !== 'function') {
    throw new Error('createApp() did not return an http.Server')
  }
  if (server.listening) throw new Error('createApp() should not call listen() itself')
  const responses = await exchange(server, requests)
  return { responses, log }
}

function rawJson(res, status, value) {
  if (res.headersSent) return res.end()
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(value))
}

function thrownInfo(err) {
  return {
    thrown: {
      name: err?.name,
      message: err?.message,
      status: err?.status,
      code: err?.code,
      details: err?.details
    }
  }
}

const probes = {
  async sendJson(c, req, res) {
    const { sendJson } = await import('../src/respond.js')
    sendJson(res, c.status, c.body)
  },
  async readBody(c, req, res) {
    const { readBody } = await import('../src/body.js')
    rawJson(res, 200, { text: await readBody(req, c.limit) })
  },
  async readJson(c, req, res) {
    const { readJson } = await import('../src/body.js')
    rawJson(res, 200, { value: await readJson(req, c.limit) })
  },
  async handleError(c, req, res, log) {
    const { handleError, HttpError } = await import('../src/errors.js')
    if (c.requestId) res.setHeader('x-request-id', c.requestId)
    const err = c.http ? new HttpError(...c.http) : new Error(c.plain)
    handleError(err, req, res, (...args) => log.push(args.map(describe).join(' ')))
  }
}

/**
 * Starts a tiny server around one of the learner's helpers. Request number i is handled with cases[i],
 * so a check can test the helper without depending on the rest of the app.
 */
export async function probe(kind, cases, requests) {
  const log = []
  const server = createServer(async (req, res) => {
    const c = cases[Number(req.url.slice(1))]
    try {
      await probes[kind](c, req, res, log)
    } catch (err) {
      if (res.headersSent) res.destroy()
      else rawJson(res, 299, thrownInfo(err))
    }
  })
  const responses = await exchange(
    server,
    requests.map((r, i) => ({ ...r, path: `/${i}` }))
  )
  return { responses, log }
}
