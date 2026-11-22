// Copied into a check sandbox as .grader/harness.mjs. Every case gets a database of its own, in
// memory or in a file inside the sandbox, filled by the check, so nothing is ever written to the
// workspace. Every server listens on port 0 and is always closed.
import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const TIMEOUT_MS = 3000

// The tables the tasks ask for, made here so a check never depends on the learner's own.
const SCHEMA = `
  CREATE TABLE workshops (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    day TEXT NOT NULL,
    seats INTEGER NOT NULL,
    priceCents INTEGER NOT NULL
  );
  CREATE TABLE bookings (
    id INTEGER PRIMARY KEY,
    workshopId INTEGER NOT NULL REFERENCES workshops (id),
    name TEXT NOT NULL
  );
`

function fill(db, { workshops = [], bookings = [] }) {
  const workshop = db.prepare(
    'INSERT INTO workshops (id, title, day, seats, priceCents) VALUES (?, ?, ?, ?, ?)'
  )
  for (const w of workshops) workshop.run(w.id, w.title, w.day, w.seats, w.priceCents)
  const booking = db.prepare('INSERT INTO bookings (id, workshopId, name) VALUES (?, ?, ?)')
  for (const b of bookings) booking.run(b.id, b.workshopId, b.name)
}

const plain = (rows) => rows.map((row) => ({ ...row }))
const describe = (err) => (err instanceof Error ? `${err.name}: ${err.message}` : String(err))

/**
 * Hands out the database through a stand-in that writes down every piece of SQL it is given and
 * what each statement gave back. `fault(sql, method)` may throw to make the database fail.
 */
function watched(db, log, fault) {
  const statement = (stmt, sql) =>
    new Proxy(stmt, {
      get(target, key) {
        const value = target[key]
        if (typeof value !== 'function') return value
        if (!['all', 'get', 'run', 'iterate'].includes(key)) return value.bind(target)
        return (...args) => {
          fault?.(sql, key)
          const result = value.apply(target, args)
          const rows = key === 'all' ? result : key === 'get' && result ? [result] : []
          log().runs.push({
            sql,
            method: key,
            count: key === 'all' ? result.length : undefined,
            keys: rows.length > 0 ? Object.keys(rows[0]) : []
          })
          return result
        }
      }
    })
  return new Proxy(db, {
    get(target, key) {
      if (key === 'prepare') {
        return (sql, ...rest) => {
          log().sql.push(String(sql))
          return statement(target.prepare(sql, ...rest), String(sql))
        }
      }
      if (key === 'exec') {
        return (sql) => {
          log().sql.push(String(sql))
          return target.exec(sql)
        }
      }
      const value = target[key]
      return typeof value === 'function' ? value.bind(target) : value
    }
  })
}

async function send(base, { method = 'GET', path, headers = {}, json, body }) {
  const init = { method, headers: { ...headers }, signal: AbortSignal.timeout(TIMEOUT_MS) }
  if (json !== undefined) {
    init.body = JSON.stringify(json)
    init.headers['content-type'] = 'application/json'
  } else if (body !== undefined) {
    init.body = body
    init.headers['content-type'] = 'application/json'
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

async function listen(handler) {
  const server = createServer(handler)
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    async close() {
      server.closeAllConnections()
      await new Promise((resolve) => server.close(resolve))
    }
  }
}

function startApp(createApp, db, staffKey) {
  const app = createApp({ db, staffKey })
  if (typeof app !== 'function' || typeof app.use !== 'function') {
    throw new Error('createApp() did not return an Express app')
  }
  return listen(app)
}

/**
 * Runs each case on a database of its own: { workshops, bookings, requests, file?, failSecond? }.
 * A request { restart: true } closes the database and the app and opens both again, as a server
 * restart would. `failSecond` makes the second booking a request inserts fail.
 */
export async function app(cases, { staffKey } = {}) {
  const { createApp } = await import('../src/app.js')
  const results = []
  for (const [index, c] of cases.entries())
    results.push(await runCase(createApp, c, index, staffKey))
  return results
}

async function runCase(createApp, c, index, staffKey) {
  const file = c.file ? join(process.cwd(), '.grader', `case-${index}.db`) : ':memory:'
  let db = new DatabaseSync(file)
  db.exec(SCHEMA)
  fill(db, c)
  let log = { sql: [], runs: [], logged: [] }
  let inserts = 0
  const fault = c.failSecond
    ? (sql, method) => {
        if (method !== 'run' || !/insert\s+(or\s+\w+\s+)?into\s+["`[]?bookings\b/i.test(sql)) return
        inserts += 1
        if (inserts === 2) throw new Error('disk I/O error (made to fail by the check)')
      }
    : undefined
  const consoleError = console.error
  console.error = (...args) =>
    log.logged.push(args.map((a) => (a instanceof Error ? describe(a) : String(a))).join(' '))
  const responses = []
  let server
  try {
    server = await startApp(
      createApp,
      watched(db, () => log, fault),
      staffKey
    )
    for (const req of c.requests) {
      if (req.restart) {
        await server.close()
        db.close()
        db = new DatabaseSync(file)
        server = await startApp(
          createApp,
          watched(db, () => log, fault),
          staffKey
        )
        responses.push({ restarted: true })
        continue
      }
      log = { sql: [], runs: [], logged: [] }
      inserts = 0
      const res = await send(server.base, req)
      responses.push({ ...res, sql: log.sql, runs: log.runs, logged: log.logged })
    }
  } catch (err) {
    return { error: describe(err), responses }
  } finally {
    console.error = consoleError
    await server?.close()
  }
  const open = db.isTransaction
  if (open) db.exec('ROLLBACK')
  const after = {
    open,
    workshops: plain(db.prepare('SELECT * FROM workshops ORDER BY id').all()),
    bookings: plain(db.prepare('SELECT * FROM bookings ORDER BY id').all())
  }
  db.close()
  return { responses, after }
}

function columns(db, table) {
  return plain(db.prepare(`PRAGMA table_info(${table})`).all())
}

/** Runs createTables twice on an empty database and describes the tables it made. */
export async function tables() {
  const { createTables } = await import('../src/db.js')
  const db = new DatabaseSync(':memory:')
  const log = { sql: [], runs: [] }
  const handle = watched(db, () => log)
  const report = {}
  try {
    createTables(handle)
  } catch (err) {
    return { error: describe(err), sql: log.sql }
  }
  report.workshops = columns(db, 'workshops')
  report.bookings = columns(db, 'bookings')
  report.bookingKeys = plain(db.prepare('PRAGMA foreign_key_list(bookings)').all())
  const attempt = (sql, ...values) => {
    try {
      return { result: { ...db.prepare(sql).run(...values) } }
    } catch (err) {
      return { error: describe(err) }
    }
  }
  report.autoId = attempt(
    'INSERT INTO workshops (title, day, seats, priceCents) VALUES (?, ?, ?, ?)',
    'Pit firing',
    'sun',
    6,
    2900
  )
  if (report.autoId.result) {
    report.autoIdRow = { ...db.prepare('SELECT id FROM workshops').get() }
  }
  report.noTitle = attempt(
    'INSERT INTO workshops (title, day, seats, priceCents) VALUES (?, ?, ?, ?)',
    null,
    'sun',
    6,
    2900
  )
  if (report.bookings.length > 0 && report.autoId.result) {
    const id = report.autoIdRow.id
    report.bookingOk = attempt('INSERT INTO bookings (workshopId, name) VALUES (?, ?)', id, 'Test')
    report.bookingMissing = attempt(
      'INSERT INTO bookings (workshopId, name) VALUES (?, ?)',
      id + 1000,
      'Test'
    )
    report.bookingNoName = attempt(
      'INSERT INTO bookings (workshopId, name) VALUES (?, ?)',
      id,
      null
    )
  }
  const count = (table) => {
    try {
      return db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n
    } catch {
      return undefined
    }
  }
  report.before = { workshops: count('workshops'), bookings: count('bookings') }
  try {
    createTables(handle)
    report.again = { ok: true }
  } catch (err) {
    report.again = { error: describe(err) }
  }
  report.after = { workshops: count('workshops'), bookings: count('bookings') }
  report.sql = log.sql
  db.close()
  return report
}

/** Seeds an empty table, seeds again, removes one workshop and seeds a third time. */
export async function seed(workshops) {
  const { seedWorkshops } = await import('../src/db.js')
  const db = new DatabaseSync(':memory:')
  db.exec(SCHEMA)
  const log = { sql: [], runs: [] }
  const handle = watched(db, () => log)
  const rows = () => plain(db.prepare('SELECT * FROM workshops ORDER BY id').all())
  const step = (name) => {
    try {
      seedWorkshops(handle, workshops)
      return { name, rows: rows() }
    } catch (err) {
      return { name, error: describe(err), rows: rows() }
    }
  }
  const steps = [step('first'), step('second')]
  const second = db.prepare('SELECT id FROM workshops ORDER BY id LIMIT 1 OFFSET 1').get()
  if (second) db.prepare('DELETE FROM workshops WHERE id = ?').run(second.id)
  steps.push({ ...step('after one was removed'), removed: second?.id })
  db.close()
  return { steps, sql: log.sql }
}

/** Opens `rel` inside the sandbox, changes it, closes it and opens it again. */
export async function open(rel) {
  const { openDatabase } = await import('../src/db.js')
  const { workshops } = await import('../src/workshops.js')
  const file = join(process.cwd(), rel)
  const read = (db) => plain(db.prepare('SELECT * FROM workshops ORDER BY id').all())
  const report = { file: rel, expected: workshops }
  let db
  try {
    db = openDatabase(file)
  } catch (err) {
    return { ...report, error: describe(err) }
  }
  if (!(db instanceof DatabaseSync)) {
    return { ...report, notDb: db === undefined ? 'undefined' : String(db) }
  }
  report.exists = existsSync(file)
  try {
    report.first = read(db)
    db.prepare('DELETE FROM workshops WHERE id = ?').run(workshops[0].id)
    db.prepare('UPDATE workshops SET seats = ? WHERE id = ?').run(3, workshops[1].id)
    report.changed = read(db)
  } catch (err) {
    db.close()
    return { ...report, error: describe(err) }
  }
  db.close()
  try {
    const again = openDatabase(file)
    report.second = read(again)
    again.close()
  } catch (err) {
    report.secondError = describe(err)
  }
  return report
}
