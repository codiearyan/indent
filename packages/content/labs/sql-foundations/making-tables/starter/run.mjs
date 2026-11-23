// Usage: node run.mjs queries/<file>.sql
// Builds a fresh copy of the practice's database from schema.sql and seed.sql, runs every statement
// in the file on it, and prints what each one did. The copy lives only in memory and is gone when
// the run ends, so nothing you run here is saved: run the file again and you start over.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// node:sqlite prints an experimental warning on some Node versions; it is noise here.
process.removeAllListeners('warning')
const { DatabaseSync } = await import('node:sqlite')

// What a file in this issue may hold. Anything else is skipped: it is not needed here, and some
// statements (ATTACH, VACUUM INTO) would write a file outside the copy.
const ALLOWED = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE TABLE']
const WRITES = ['INSERT', 'UPDATE', 'DELETE']
const MAX_ROWS = 1000

function splitStatements(sql) {
  const statements = []
  let current = ''
  let code = ''
  let i = 0
  const push = () => {
    if (current.trim()) statements.push({ sql: current.trim(), code: code.trim() })
    current = ''
    code = ''
  }
  while (i < sql.length) {
    const ch = sql[i]
    if (ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++
    } else if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2)
      i = end === -1 ? sql.length : end + 2
      current += ' '
      code += ' '
    } else if (ch === "'" || ch === '"') {
      let j = i + 1
      while (j < sql.length && !(sql[j] === ch && sql[j + 1] !== ch)) j += sql[j] === ch ? 2 : 1
      current += sql.slice(i, j + 1)
      code += `${ch}${ch}`
      i = j + 1
    } else if (ch === ';') {
      push()
      i++
    } else {
      current += ch
      code += ch
      i++
    }
  }
  push()
  return statements
}

const show = (v) => (v === null ? 'NULL' : typeof v === 'string' ? `'${v}'` : String(v))

function formatTable(columns, rows) {
  const cells = rows.map((row) => row.map((v) => (v === null ? 'NULL' : String(v))))
  const widths = columns.map((c, i) => Math.max(c.length, ...cells.map((r) => r[i].length)))
  const line = (values) => values.map((v, i) => v.padEnd(widths[i])).join(' | ').trimEnd()
  return [
    line(columns),
    widths.map((w) => '-'.repeat(w)).join('-+-'),
    ...cells.map(line),
    `(${rows.length} ${rows.length === 1 ? 'row' : 'rows'})`
  ].join('\n')
}

/** Every row of every table, by rowid. */
function snapshot(db) {
  const tables = {}
  for (const { name } of db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite%'").all()) {
    const stmt = db.prepare(`SELECT rowid AS "rowid:", * FROM "${name}"`)
    stmt.setReturnArrays(true)
    const rows = new Map()
    for (const [rowid, ...values] of stmt.iterate()) rows.set(rowid, values)
    tables[name] = { columns: stmt.columns().slice(1).map((c) => c.name), rows }
  }
  return tables
}

function printChanges(before, after) {
  const lines = []
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
  for (const [table, { columns, rows }] of Object.entries(after)) {
    const old = before[table]?.rows ?? new Map()
    const describe = (row) => columns.map((c, i) => `${c} = ${show(row[i])}`).join(', ')
    for (const [id, row] of rows) {
      if (!old.has(id)) lines.push(`  ${table}: added ${describe(row)}`)
      else if (!same(old.get(id), row)) {
        const diff = columns.flatMap((c, i) => (same(old.get(id)[i], row[i]) ? [] : [`${c} ${show(old.get(id)[i])} -> ${show(row[i])}`]))
        lines.push(`  ${table} id ${id}: ${diff.join(', ')}`)
      }
    }
    for (const [id, row] of old) if (!rows.has(id)) lines.push(`  ${table}: removed ${describe(row)}`)
  }
  console.log('')
  if (lines.length) console.log(`What changed, compared with seed.sql:\n${lines.join('\n')}`)
  else console.log('Nothing in the database changed, compared with seed.sql.')
}

function describeTable(db, name) {
  const unique = db
    .prepare("SELECT ii.name FROM pragma_index_list(?) AS il JOIN pragma_index_info(il.name) AS ii WHERE il.origin = 'u'")
    .all(name)
    .map((c) => c.name)
  const keys = new Map(db.prepare('SELECT "from", "table", "to" FROM pragma_foreign_key_list(?)').all(name).map((k) => [k.from, k]))
  const strict = db.prepare('SELECT strict FROM pragma_table_list WHERE name = ?').get(name)?.strict
  const columns = db.prepare('SELECT name, type, "notnull", dflt_value, pk FROM pragma_table_info(?)').all(name)
  const lines = columns.map((c) => {
    const rules = [c.pk ? 'PRIMARY KEY' : '', c.notnull ? 'NOT NULL' : '', unique.includes(c.name) ? 'UNIQUE' : '']
    if (c.dflt_value !== null) rules.push(`DEFAULT ${c.dflt_value}`)
    const key = keys.get(c.name)
    if (key) rules.push(`REFERENCES ${key.table} (${key.to ?? 'its key'})`)
    return `  ${[c.name, c.type, ...rules].filter(Boolean).join(' ')}`
  })
  return `${lines.join('\n')}${strict ? '\n  (STRICT: a value of the wrong type is refused)' : ''}`
}

const file = process.argv[2]
if (!file) {
  console.log('Usage: node run.mjs queries/<file>.sql')
  process.exit(1)
}

let text
try {
  text = readFileSync(file, 'utf8')
} catch {
  console.log(`Could not read ${file}. Check the name, for example queries/1-vets.sql`)
  process.exit(1)
}

const here = import.meta.dirname
const db = new DatabaseSync(':memory:')
db.exec('PRAGMA foreign_keys = ON')
db.exec(readFileSync(join(here, 'schema.sql'), 'utf8'))
db.exec(readFileSync(join(here, 'seed.sql'), 'utf8'))
const start = snapshot(db)

const statements = splitStatements(text)
if (statements.length === 0) {
  console.log(`${file} is empty: it has no statement yet, only comments. Write yours below them.`)
}

let wrote = false
for (const [index, { sql, code }] of statements.entries()) {
  if (index > 0) console.log('')
  const words = (code.match(/^[a-z]+(\s+[a-z]+){0,2}/i)?.[0] ?? '').toUpperCase().split(/\s+/).join(' ')
  const phrase = ALLOWED.find((p) => `${words} `.startsWith(`${p} `))
  if (!phrase) {
    const first = words.split(' ')
    const named = ['CREATE', 'DROP', 'ALTER'].includes(first[0]) ? first.slice(0, 2).join(' ') : first[0]
    const keys = /foreign_keys/i.test(sql) ? ' Keys that point at another table are switched on already.' : ''
    console.log(`Skipped: this statement starts with ${named || 'something that is not SQL'}, which this issue does not need. Nothing was run.${keys}`)
    continue
  }
  try {
    const stmt = db.prepare(sql)
    const columns = stmt.columns().map((c) => c.name)
    if (phrase === 'EXPLAIN' && columns.includes('detail')) {
      // A query plan: one line per step, indented under the step it belongs to.
      const depth = new Map([[0, 0]])
      const lines = stmt.all().map((step) => {
        depth.set(step.id, (depth.get(step.parent) ?? 0) + 1)
        return `${'  '.repeat(depth.get(step.id))}${step.detail}`
      })
      console.log(`Query plan:\n${lines.join('\n')}`)
      continue
    }
    if (columns.length) {
      stmt.setReturnArrays(true)
      const rows = []
      for (const row of stmt.iterate()) {
        if (rows.length === MAX_ROWS) break
        rows.push(row)
      }
      console.log(formatTable(columns, rows))
      if (rows.length === MAX_ROWS) {
        console.log(`Stopped after ${MAX_ROWS} rows, far more than any table here holds. Look for a part of the query that repeats rows.`)
      }
      continue
    }
    const { changes } = stmt.run()
    const rows = `${changes} ${changes === 1 ? 'row' : 'rows'}`
    if (WRITES.includes(phrase)) wrote = true
    if (phrase === 'INSERT') console.log(`INSERT added ${rows}.`)
    else if (phrase === 'UPDATE') console.log(`UPDATE changed ${rows}.`)
    else if (phrase === 'DELETE') console.log(`DELETE removed ${rows}.`)
    else if (phrase === 'BEGIN') console.log('BEGIN: a transaction is open. COMMIT keeps what follows, ROLLBACK undoes it.')
    else if (phrase === 'COMMIT' || phrase === 'END') console.log('COMMIT: the changes since BEGIN are kept.')
    else if (phrase === 'ROLLBACK') console.log('ROLLBACK: the changes since BEGIN are undone.')
    else if (phrase === 'CREATE TABLE') {
      const name = db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY rowid DESC LIMIT 1").get().name
      console.log(`Made the table ${name}:\n${describeTable(db, name)}`)
    } else if (phrase === 'CREATE INDEX' || phrase === 'CREATE UNIQUE INDEX') {
      const { name, tbl } = db.prepare("SELECT name, tbl_name AS tbl FROM sqlite_schema WHERE type = 'index' ORDER BY rowid DESC LIMIT 1").get()
      const on = db.prepare('SELECT name FROM pragma_index_info(?) ORDER BY seqno').all(name).map((c) => c.name)
      console.log(`Made the index ${name} on ${tbl} (${on.join(', ')}).`)
    } else if (phrase === 'DROP INDEX') {
      console.log(`Removed the index ${code.match(/\bindex\s+(if\s+exists\s+)?(\S+)/i)?.[2] ?? ''}.`.replace(' .', '.'))
    }
    else console.log('Done.')
  } catch (err) {
    console.log(`Statement ${index + 1} did not run. SQLite says: ${err.message}`)
    console.log(`  ${sql.split('\n')[0]}`)
    process.exitCode = 1
  }
}

try {
  db.exec('ROLLBACK')
  console.log('\nYour file started a transaction and never ended it, so the changes in it were undone when the database closed.')
} catch {
  // no transaction was open
}
if (wrote) printChanges(start, snapshot(db))
console.log(`\nThis ran on a fresh copy made from schema.sql and seed.sql. Nothing was saved.`)
