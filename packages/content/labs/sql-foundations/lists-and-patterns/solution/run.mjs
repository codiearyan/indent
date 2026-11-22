// Usage: node run.mjs queries/<file>.sql
// Builds a fresh copy of the practice's database from schema.sql and seed.sql, runs the query in
// the file and prints the rows it returns. Nothing you run here is saved.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// node:sqlite prints an experimental warning on some Node versions; it is noise here.
process.removeAllListeners('warning')
const { DatabaseSync } = await import('node:sqlite')

function splitStatements(sql) {
  const statements = []
  let current = ''
  let i = 0
  while (i < sql.length) {
    const ch = sql[i]
    if (ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++
    } else if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2)
      i = end === -1 ? sql.length : end + 2
      current += ' '
    } else if (ch === "'" || ch === '"') {
      let j = i + 1
      while (j < sql.length && !(sql[j] === ch && sql[j + 1] !== ch)) j += sql[j] === ch ? 2 : 1
      current += sql.slice(i, j + 1)
      i = j + 1
    } else if (ch === ';') {
      statements.push(current.trim())
      current = ''
      i++
    } else {
      current += ch
      i++
    }
  }
  statements.push(current.trim())
  return statements.filter(Boolean)
}

function formatTable(columns, rows) {
  const show = (v) => (v === null ? 'NULL' : String(v))
  const cells = rows.map((row) => row.map(show))
  const widths = columns.map((c, i) => Math.max(c.length, ...cells.map((r) => r[i].length)))
  const line = (values) => values.map((v, i) => v.padEnd(widths[i])).join(' | ').trimEnd()
  return [
    line(columns),
    widths.map((w) => '-'.repeat(w)).join('-+-'),
    ...cells.map(line),
    `(${rows.length} ${rows.length === 1 ? 'row' : 'rows'})`
  ].join('\n')
}

// Statements that change the data or the database. The first issues only read.
const CHANGES = ['INSERT', 'UPDATE', 'DELETE', 'REPLACE', 'DROP', 'CREATE', 'ALTER']
const MAX_ROWS = 1000
const REFUSED = ['INSERT', 'UPDATE', 'DELETE', 'REPLACE', 'DROP', 'CREATE', 'ALTER', 'ATTACH', 'DETACH', 'VACUUM', 'REINDEX', 'PRAGMA', 'BEGIN', 'COMMIT', 'END', 'ROLLBACK', 'SAVEPOINT', 'RELEASE', 'ANALYZE']

const file = process.argv[2]
if (!file) {
  console.log('Usage: node run.mjs queries/<file>.sql')
  process.exit(1)
}

let text
try {
  text = readFileSync(file, 'utf8')
} catch {
  console.log(`Could not read ${file}. Check the name, for example queries/1-every-animal.sql`)
  process.exit(1)
}

const here = import.meta.dirname
const db = new DatabaseSync(':memory:')
db.exec(readFileSync(join(here, 'schema.sql'), 'utf8'))
db.exec(readFileSync(join(here, 'seed.sql'), 'utf8'))
db.exec('PRAGMA query_only = ON')

const statements = splitStatements(text)
if (statements.length === 0) {
  console.log(`${file} is empty: it has no query yet, only comments. Write your query below them.`)
}

for (const [index, sql] of statements.entries()) {
  if (index > 0) console.log('')
  const word = (sql.match(/^[a-z]+/i)?.[0] ?? '').toUpperCase()
  const refuse = (start) =>
    console.log(`Skipped: ${start} In this issue a query only reads, so it starts with SELECT. Nothing was run.`)
  if (REFUSED.includes(word)) {
    refuse(`this statement starts with ${word}${CHANGES.includes(word) ? ', which changes the data' : ', not SELECT'}.`)
    continue
  }
  try {
    const stmt = db.prepare(sql)
    const columns = stmt.columns().map((c) => c.name)
    // A statement that returns no columns is not a query; ATTACH or VACUUM INTO would write a file.
    if (columns.length === 0) {
      refuse('this statement tries to change the data.')
      continue
    }
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
  } catch (err) {
    if (/readonly/.test(err.message)) {
      refuse('this statement tries to change the data.')
      continue
    }
    console.log(`SQL error: ${err.message}`)
    console.log(`  ${sql.split('\n')[0]}`)
    process.exitCode = 1
  }
}

if (statements.length > 1) {
  console.log(`\n${file} has ${statements.length} statements. Check reads one query per file, so keep only the one that answers the task.`)
}
