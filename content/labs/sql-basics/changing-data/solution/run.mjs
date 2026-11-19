// Usage: node run.mjs queries/<file>.sql
// Builds a fresh in-memory database from schema.sql and seed.sql, runs every statement in the
// file and prints what each one returns. Nothing you run here is saved.
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

const file = process.argv[2]
if (!file) {
  console.log('Usage: node run.mjs queries/<file>.sql')
  process.exit(1)
}

const db = new DatabaseSync(':memory:')
const here = import.meta.dirname
db.exec(readFileSync(join(here, 'schema.sql'), 'utf8'))
db.exec(readFileSync(join(here, 'seed.sql'), 'utf8'))

let text
try {
  text = readFileSync(file, 'utf8')
} catch {
  console.log(`Could not read ${file}. Check the path, for example queries/1-...sql`)
  process.exit(1)
}
const statements = splitStatements(text)
if (statements.length === 0) console.log(`${file} has no SQL statements yet. Write your SQL below the comments.`)

for (const [index, sql] of statements.entries()) {
  try {
    const stmt = db.prepare(sql)
    const columns = stmt.columns().map((c) => c.name)
    if (columns.length > 0) {
      stmt.setReturnArrays(true)
      console.log(formatTable(columns, stmt.all()))
    } else {
      const { changes } = stmt.run()
      const writes = /^(insert|update|delete|replace|with)\b/i.test(sql)
      console.log(writes ? `OK, ${changes} ${changes === 1 ? 'row' : 'rows'} changed.` : 'OK.')
    }
    if (index < statements.length - 1) console.log('')
  } catch (err) {
    console.log(`SQL error in statement ${index + 1}: ${err.message}`)
    console.log(`  ${sql.split('\n')[0]}`)
    process.exit(1)
  }
}
