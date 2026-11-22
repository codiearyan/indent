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
    init.headers['content-type'] ??= 'application/json'
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

// Wraps the learner's app so a second answer to one request is seen: Node either throws once the
// headers are out, or quietly ignores a second end(). Either way the client never notices.
async function guarded(inner) {
  const { default: express } = await import('express')
  const outer = express()
  const late = []
  outer.use((req, res, next) => {
    const end = res.end
    res.end = function (...args) {
      if (this.writableEnded) late.push('It answered again after the answer had been sent.')
      return end.apply(this, args)
    }
    inner(req, res, next)
  })
  outer.use((err, req, res, next) => {
    if (!res.headersSent) return next(err)
    // Recorded, not passed on: Express would drop the connection and fail the next request too.
    late.push(`After answering, it threw ${err?.name ?? 'an error'}: ${err?.message}`)
    if (!res.writableEnded) res.end()
  })
  return { handler: outer, late }
}

async function exchange(inner, requests) {
  const { handler, late } = await guarded(inner)
  const server = createServer(handler)
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    const responses = []
    for (const request of requests) {
      const res = await send(base, request)
      await new Promise((resolve) => setImmediate(resolve))
      if (late.length > 0) res.late = late.splice(0).join('\n')
      responses.push(res)
    }
    return responses
  } finally {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
}

async function storeFor(options) {
  const { createStore } = await import('../src/store.js')
  const store = createStore(options.workshops ?? [])
  if (options.brokenList) {
    store.list = () => {
      throw new Error(options.brokenList)
    }
  }
  return store
}

function expressApp(app, made) {
  if (typeof app !== 'function' || typeof app.use !== 'function') {
    throw new Error(`${made} did not return an Express app`)
  }
  return app
}

/** Starts the learner's app with createApp({ store, staffKey }) and sends `requests` in order. */
export async function app(requests, options = {}) {
  const { createApp } = await import('../src/app.js')
  const given = { store: await storeFor(options) }
  if (options.staffKey) given.staffKey = options.staffKey
  const handler = expressApp(createApp(given), 'createApp()')
  const logged = []
  const log = console.error
  console.error = (...args) => logged.push(args.map(describe).join(' '))
  try {
    return { responses: await exchange(handler, requests), logged }
  } finally {
    console.error = log
  }
}

const describe = (value) => (value instanceof Error ? `${value.stack}` : String(value))

/**
 * Runs handleErrors on an error that comes after the answer has started, and says what reached
 * the end of the line: the same error, another one, or nothing.
 */
export async function lateError() {
  const { default: express } = await import('express')
  const { handleErrors } = await import('../src/middleware/errors.js')
  const app = express()
  const original = new Error('late failure')
  let reached = null
  app.get('/', (req, res, next) => {
    res.write('partly sent')
    next(original)
    setTimeout(() => res.writableEnded || res.end(), 200)
  })
  app.use((err, req, res, next) => handleErrors(err, req, res, next))
  app.use((err, req, res, next) => {
    reached = err === original ? 'same' : `${err?.name}: ${err?.message}`
    res.end()
  })
  const server = createServer(app)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/`, {
      signal: AbortSignal.timeout(TIMEOUT_MS)
    })
    await res.text().catch(() => {})
  } catch {}
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
  return { reached }
}

/** Mounts the learner's workshopsRouter(store) at `options.mount` in an app of its own. */
export async function router(requests, options = {}) {
  const { default: express } = await import('express')
  const { workshopsRouter } = await import('../src/routes/workshops.js')
  const outer = express()
  outer.use(express.json())
  outer.use(
    options.mount,
    expressApp(workshopsRouter(await storeFor(options)), 'workshopsRouter()')
  )
  return { responses: await exchange(outer, requests) }
}

/** Calls validateWorkshop once per case; a case without `body` passes undefined. */
export async function validate(cases) {
  const { validateWorkshop } = await import('../src/validate.js')
  return cases.map((c) => {
    try {
      return { value: validateWorkshop(c.body, c.options) ?? null }
    } catch (err) {
      return { thrown: err instanceof Error ? err.message : String(err) }
    }
  })
}
