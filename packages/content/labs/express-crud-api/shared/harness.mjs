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

async function exchange(handler, requests) {
  const server = createServer(handler)
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
  return { responses: await exchange(handler, requests) }
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
