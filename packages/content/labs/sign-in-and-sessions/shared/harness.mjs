// Copied into a check sandbox as .grader/harness.mjs. Every server it starts listens on port 0
// and is always closed. Each case gets a fresh app with the check's own staff, sessions and clock.
import { createServer } from 'node:http'
import { createRequire, syncBuiltinESMExports } from 'node:module'

const TIMEOUT_MS = 3000

// Counts how often learner code reaches into node:crypto. Patched before any learner module is
// imported, and synced so named imports see the counting versions too.
const crypto = createRequire(import.meta.url)('node:crypto')
const real = { scryptSync: crypto.scryptSync, randomBytes: crypto.randomBytes }
const calls = { scrypt: 0, timingSafeEqual: 0, random: 0 }
function count(target, name, counter) {
  const original = target[name]
  if (typeof original !== 'function') return
  target[name] = function (...args) {
    calls[counter]++
    return original.apply(this, args)
  }
}
count(crypto, 'scryptSync', 'scrypt')
count(crypto, 'scrypt', 'scrypt')
count(crypto, 'timingSafeEqual', 'timingSafeEqual')
for (const name of ['randomBytes', 'randomFillSync', 'randomFill', 'randomUUID', 'randomInt']) {
  count(crypto, name, 'random')
}
count(globalThis.crypto, 'getRandomValues', 'random')
syncBuiltinESMExports()

const counted = () => ({ ...calls })
const since = (before) =>
  Object.fromEntries(Object.keys(calls).map((k) => [k, calls[k] - before[k]]))

/** The check's own hash, made without learner code: '<salt hex>:<scrypt hex>'. */
export function hashFor(password) {
  const salt = real.randomBytes(16).toString('hex')
  return `${salt}:${real.scryptSync(password, salt, 64).toString('hex')}`
}

// Everything written to stdout or stderr while `run` goes on, console.* included.
async function captured(run) {
  let out = ''
  const writes = [process.stdout.write, process.stderr.write]
  const write = (chunk, ...rest) => {
    out += String(chunk)
    rest.find((arg) => typeof arg === 'function')?.()
    return true
  }
  process.stdout.write = write
  process.stderr.write = write
  try {
    const value = await run()
    return { value, out }
  } catch (err) {
    return { thrown: describe(err), out }
  } finally {
    ;[process.stdout.write, process.stderr.write] = writes
  }
}

const describe = (err) => (err instanceof Error ? `${err.name}: ${err.message}` : String(err))
const plain = (value) => (value === undefined ? null : JSON.parse(JSON.stringify(value)))

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
    const headers = Object.fromEntries(res.headers)
    delete headers['set-cookie']
    return { status: res.status, headers, cookies: res.headers.getSetCookie(), text, json: parsed }
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
    late.push(`After answering, it threw ${err?.name ?? 'an error'}: ${err?.message}`)
    if (!res.writableEnded) res.end()
  })
  return { handler: outer, late }
}

async function exchange(inner, requests, beforeEach) {
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
      beforeEach?.(request)
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

async function staffStore(people) {
  const { createStaffStore } = await import('../src/staffStore.js')
  const staff = createStaffStore()
  const ids = {}
  for (const { name, email, role, passwordHash } of people) {
    ids[email] = staff.add({ name, email, role, passwordHash }).id
  }
  return { staff, ids }
}

const hashed = (people = []) => people.map((p) => ({ ...p, passwordHash: hashFor(p.password) }))

/**
 * Runs each case in a fresh app: createApp({ store, staff, sessions, staffKey, now }). A case is
 * { requests, sessions?: [{ token, as?, staffId?, expiresAt? }], clock? }; a request may carry
 * `advance`, milliseconds the clock moves on before it is sent. Returns per case the responses,
 * what was printed, and the sessions the store holds afterwards.
 */
export async function cases(list, options = {}) {
  const { createApp } = await import('../src/app.js')
  const { createStore } = await import('../src/store.js')
  const people = hashed(options.staff)
  const results = []
  for (const c of list) {
    const { staff, ids } = await staffStore(people)
    const tokens = new Set()
    let sessions
    if (options.sessions) {
      const { createSessionStore } = await import('../src/sessionStore.js')
      sessions = createSessionStore()
      for (const s of c.sessions ?? []) {
        const session = { staffId: s.staffId ?? ids[s.as] }
        if (s.expiresAt !== undefined) session.expiresAt = s.expiresAt
        sessions.save(s.token, session)
        tokens.add(s.token)
      }
      const save = sessions.save
      sessions.save = function (token, ...rest) {
        tokens.add(token)
        return save.call(this, token, ...rest)
      }
    }
    let time = c.clock ?? options.clock ?? 1_900_000_000_000
    const given = { store: createStore(options.workshops ?? []), staff, now: () => time }
    if (sessions) given.sessions = sessions
    if (options.staffKey) given.staffKey = options.staffKey
    const run = await captured(async () => {
      const app = createApp(given)
      if (typeof app !== 'function' || typeof app.use !== 'function') {
        throw new Error('createApp() did not return an Express app')
      }
      return exchange(app, c.requests, (req) => (time += req.advance ?? 0))
    })
    results.push({
      error: run.thrown,
      responses: run.value ?? [],
      out: run.out,
      ids,
      sessions: sessions
        ? [...tokens].map((token) => ({ token, session: plain(sessions.get(token)) }))
        : [],
      workshops: given.store.list()
    })
  }
  return { results, hashes: people.map((p) => p.passwordHash) }
}

/** Calls hashPassword twice for each password. */
export async function hashes(passwords) {
  const { hashPassword } = await import('../src/passwords.js')
  return passwords.map((password) => {
    try {
      return { results: [hashPassword(password), hashPassword(password)].map(plain) }
    } catch (err) {
      return { thrown: describe(err) }
    }
  })
}

/** Calls verifyPassword for each { password, stored } and counts constant-time comparisons. */
export async function verifies(list) {
  const { verifyPassword } = await import('../src/passwords.js')
  return list.map(({ password, stored }) => {
    const before = counted()
    try {
      return { value: plain(verifyPassword(password, stored)), calls: since(before) }
    } catch (err) {
      return { thrown: describe(err), calls: since(before) }
    }
  })
}

/** Adds each person with addStaff to a fresh staff store. */
export async function addsStaff(people) {
  const { addStaff } = await import('../src/staff.js')
  const { staff } = await staffStore([])
  const run = await captured(() => people.map((person) => plain(addStaff(staff, { ...person }))))
  return { returned: run.value, thrown: run.thrown, records: staff.list(), out: run.out }
}

/** Calls checkSignIn(staff, email, password) for each attempt, against the check's own staff. */
export async function signIns(people, attempts) {
  const { checkSignIn } = await import('../src/signIn.js')
  const list = hashed(people)
  const { staff } = await staffStore(list)
  const runs = []
  for (const { email, password } of attempts) {
    const before = counted()
    const run = await captured(() => checkSignIn(staff, email, password))
    runs.push({ value: plain(run.value), thrown: run.thrown, out: run.out, calls: since(before) })
  }
  return { runs, hashes: list.map((p) => p.passwordHash) }
}

/** Calls newToken() n times with Math.random and the clock held still. */
export async function tokens(n) {
  const { newToken } = await import('../src/tokens.js')
  const held = [Math.random, Date.now, performance.now]
  Math.random = () => 0.42
  Date.now = () => 1_900_000_000_000
  performance.now = () => 1234.5
  const before = counted()
  try {
    const made = []
    for (let i = 0; i < n; i++) made.push(plain(newToken()))
    return { tokens: made, calls: since(before) }
  } catch (err) {
    return { thrown: describe(err), calls: since(before) }
  } finally {
    ;[Math.random, Date.now, performance.now] = held
  }
}

/**
 * Puts allow(...roles) in front of a route that answers 200, in an app where a request's
 * x-test-role header (when sent) makes it signed in with that role.
 */
export async function allows(list) {
  const { default: express } = await import('express')
  const { allow } = await import('../src/middleware/allow.js')
  const results = []
  for (const { roles, role } of list) {
    const app = express()
    app.use((req, res, next) => {
      if (req.get('x-test-role')) req.staff = { id: 7, name: 'Kofi', role: req.get('x-test-role') }
      next()
    })
    const run = await captured(async () => {
      app.delete('/workshops/11', allow(...roles), (req, res) => res.json({ reached: true }))
      app.use((err, req, res, next) => res.status(500).json({ thrown: describe(err) }))
      const headers = role ? { 'x-test-role': role } : {}
      return exchange(app, [{ method: 'DELETE', path: '/workshops/11', headers }])
    })
    results.push({ res: run.value?.[0], thrown: run.thrown, out: run.out })
  }
  return results
}
