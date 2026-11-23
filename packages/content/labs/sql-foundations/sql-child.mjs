// Called by sqlcheck.mjs through t.call, in a child process, so a query that never ends hits the timeout.
import { readFileSync } from 'node:fs'

process.removeAllListeners('warning')
const { DatabaseSync } = await import('node:sqlite')

const MAX_ROWS = 1000
// Never run: they change the data, and ATTACH or VACUUM INTO could write a file even with query_only on.
const REFUSED = ['INSERT', 'UPDATE', 'DELETE', 'REPLACE', 'DROP', 'CREATE', 'ALTER', 'ATTACH', 'DETACH', 'VACUUM', 'REINDEX', 'PRAGMA', 'BEGIN', 'COMMIT', 'END', 'ROLLBACK', 'SAVEPOINT', 'RELEASE', 'ANALYZE']

/** Splits SQL into statements. `code` has comments removed and text values emptied. */
export function scan(sql) {
  const statements = []
  let text = ''
  let code = ''
  let literals = []
  const push = () => {
    if (text.trim()) statements.push({ text: text.trim(), code, literals })
    text = ''
    code = ''
    literals = []
  }
  let i = 0
  while (i < sql.length) {
    const ch = sql[i]
    if (ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++
    } else if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2)
      i = end === -1 ? sql.length : end + 2
      text += ' '
      code += ' '
    } else if (ch === "'" || ch === '"') {
      let j = i + 1
      while (j < sql.length && !(sql[j] === ch && sql[j + 1] !== ch)) j += sql[j] === ch ? 2 : 1
      const quoted = sql.slice(i, j + 1)
      text += quoted
      if (ch === "'") {
        code += "''"
        literals.push(sql.slice(i + 1, j).replaceAll("''", "'"))
      } else {
        code += quoted
      }
      i = j + 1
    } else if (ch === ';') {
      push()
      i++
    } else {
      text += ch
      code += ch
      i++
    }
  }
  push()
  return statements
}

function runFile(db, file) {
  let source
  try {
    source = readFileSync(file, 'utf8')
  } catch {
    return { unreadable: true }
  }
  const statements = scan(source)
  if (statements.length === 0) return { empty: true }
  if (statements.length > 1) return { count: statements.length }
  const [{ text, code, literals }] = statements
  const result = { code, literals, line: text.split('\n')[0] }
  const word = (code.trim().match(/^[a-z]+/i)?.[0] ?? '').toUpperCase()
  if (REFUSED.includes(word)) return { ...result, refused: word }
  try {
    const stmt = db.prepare(text)
    const columns = stmt.columns().map((c) => c.name)
    if (columns.length === 0) return { ...result, refused: word }
    stmt.setReturnArrays(true)
    const rows = []
    for (const row of stmt.iterate()) {
      if (rows.length === MAX_ROWS) return { ...result, tooMany: true }
      rows.push(row)
    }
    return { ...result, columns, rows }
  } catch (err) {
    if (/readonly/.test(err.message)) return { ...result, refused: word }
    return { ...result, error: err.message }
  }
}

function textValues(db) {
  const values = new Set()
  const tables = db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table'").all()
  for (const { name } of tables) {
    for (const col of db.prepare(`SELECT name, type FROM pragma_table_info('${name}')`).all()) {
      if (col.type !== 'TEXT') continue
      for (const r of db.prepare(`SELECT DISTINCT "${col.name}" AS v FROM "${name}"`).all()) {
        if (r.v !== null) values.add(r.v)
      }
    }
  }
  return [...values]
}

/** job: { schema, seed, more?, files }. Returns one result per file, and every text value in the data. */
export function run(job) {
  const db = new DatabaseSync(':memory:')
  db.exec(readFileSync(job.schema, 'utf8'))
  db.exec(readFileSync(job.seed, 'utf8'))
  for (const more of job.more ?? []) db.exec(readFileSync(more, 'utf8'))
  db.exec('PRAGMA query_only = ON')
  const results = job.files.map((f) => runFile(db, f))
  const values = textValues(db)
  db.close()
  return { results, values }
}

// The second mode, for the issues that change rows, make tables or make indexes. Each file runs on its
// own fresh copy in memory, so nothing it does reaches a file or the next run.

/** The first words of a statement in capitals, e.g. 'CREATE UNIQUE INDEX'. `code` is from scan(). */
const lead = (code) => (code.trim().match(/^[a-z]+(\s+[a-z]+){0,2}/i)?.[0] ?? '').toUpperCase().split(/\s+/).join(' ')
/** The phrase of `phrases` a statement starts with, or undefined. */
const startsWith = (code, phrases) => phrases.find((p) => `${lead(code)} `.startsWith(`${p} `))

function fresh(job) {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(readFileSync(job.schema, 'utf8'))
  for (const seed of job.seeds) db.exec(readFileSync(seed, 'utf8'))
  return db
}

/** Every row of every table, by rowid: { table: { columns, rows: { rowid: [values] } } }. */
function snapshot(db) {
  const tables = {}
  for (const { name } of db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite%'").all()) {
    const stmt = db.prepare(`SELECT rowid AS "rowid:", * FROM "${name}"`)
    stmt.setReturnArrays(true)
    const rows = {}
    for (const [rowid, ...values] of stmt.iterate()) rows[rowid] = values
    tables[name] = { columns: stmt.columns().slice(1).map((c) => c.name), rows }
  }
  return tables
}

function indexes(db) {
  const list = db.prepare("SELECT name, tbl_name AS tbl FROM sqlite_schema WHERE type = 'index' AND sql IS NOT NULL").all()
  return list.map(({ name, tbl }) => ({
    name,
    table: tbl,
    columns: db.prepare('SELECT name FROM pragma_index_info(?) ORDER BY seqno').all(name).map((c) => c.name)
  }))
}

/** Runs one probe in a savepoint and undoes it: { ok, rows } or { ok: false, error }. */
function probe(db, { run, read }) {
  db.exec('SAVEPOINT probe')
  try {
    for (const sql of run) db.prepare(sql).run()
    if (!read) return { ok: true }
    const stmt = db.prepare(read)
    stmt.setReturnArrays(true)
    return { ok: true, rows: stmt.all() }
  } catch (err) {
    return { ok: false, error: err.message }
  } finally {
    db.exec('ROLLBACK TO probe; RELEASE probe')
  }
}

function changeFile(db, file, job) {
  let source
  try {
    source = readFileSync(file, 'utf8')
  } catch {
    return { unreadable: true }
  }
  const statements = scan(source)
  if (statements.length === 0) return { empty: true }
  const result = { code: statements.map((s) => s.code), literals: statements.flatMap((s) => s.literals), ran: [] }
  const refused = statements.find((s) => !startsWith(s.code, job.allowed))
  if (refused) {
    const words = lead(refused.code).split(' ')
    const named = ['CREATE', 'DROP', 'ALTER'].includes(words[0]) ? words.slice(0, 2).join(' ') : words[0]
    return { ...result, refused: named, line: refused.text.split('\n')[0] }
  }
  for (const [i, { text, code }] of statements.entries()) {
    const phrase = startsWith(code, job.allowed)
    if (job.only && !startsWith(code, job.only)) continue
    if (phrase === 'ROLLBACK') result.tried = snapshot(db)
    try {
      const stmt = db.prepare(text)
      let read = 0
      if (stmt.columns().length === 0) stmt.run()
      else for (const _ of stmt.iterate()) if (++read >= MAX_ROWS) break
      result.ran.push(phrase)
    } catch (err) {
      return { ...result, error: err.message, at: i + 1, line: text.split('\n')[0] }
    }
  }
  try {
    db.exec('ROLLBACK')
    result.leftOpen = true
  } catch {
    // no transaction was open
  }
  return result
}

/**
 * job: { schema, seeds, files, allowed, only?, snapshot?, table?, probes?, plans? }. Each file runs on a
 * fresh copy: statements that do not start with a phrase of `allowed` are refused before anything runs,
 * and with `only` set just the statements that start with one of those run. Returns, per file, what
 * ran and the state afterwards, and the state before any file ran.
 */
export function change(job) {
  const start = fresh(job)
  const before = { tables: job.snapshot ? snapshot(start) : undefined, indexes: indexes(start) }
  start.close()
  const results = job.files.map((file) => {
    const db = fresh(job)
    const r = changeFile(db, file, job)
    if (r.ran && r.error === undefined) {
      if (job.snapshot) r.final = snapshot(db)
      r.indexes = indexes(db)
      if (job.plans) r.plans = job.plans.map((sql) => db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all().map((p) => p.detail))
      if (job.table) {
        const columns = db.prepare('SELECT name, type FROM pragma_table_info(?)').all(job.table)
        r.columns = columns.map((c) => [c.name, c.type])
        if (columns.length) r.probes = job.probes.map((p) => probe(db, p))
      }
    }
    db.close()
    return r
  })
  return { before, results }
}
