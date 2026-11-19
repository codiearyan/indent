// Called by sqlcheck.mjs through t.call, in a child process, so a runaway query hits the timeout.
import { readFileSync } from 'node:fs'

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

function dump(db, table) {
  const stmt = db.prepare(`SELECT * FROM ${table} ORDER BY rowid`)
  stmt.setReturnArrays(true)
  return { columns: stmt.columns().map((c) => c.name), rows: stmt.all() }
}

function runFile(job, file) {
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    return { error: 'The file could not be read. Did you rename, move or delete it?' }
  }
  const statements = splitStatements(text)
  if (statements.length === 0) return { empty: true }
  const db = new DatabaseSync(':memory:')
  db.exec(readFileSync(job.schema, 'utf8'))
  db.exec(readFileSync(job.seed, 'utf8'))
  const result = { statements, columns: [], rows: [] }
  for (const [index, sql] of statements.entries()) {
    try {
      const stmt = db.prepare(sql)
      const columns = stmt.columns().map((c) => c.name)
      if (columns.length > 0) {
        stmt.setReturnArrays(true)
        Object.assign(result, { columns, rows: stmt.all() })
      } else {
        stmt.run()
      }
    } catch (err) {
      return { ...result, error: `SQL error in statement ${index + 1}: ${err.message}\n  ${sql.split('\n')[0]}` }
    }
  }
  result.openTransaction = db.isTransaction
  if (job.tables) result.tables = Object.fromEntries(job.tables.map((t) => [t, dump(db, t)]))
  db.close()
  return result
}

/** job: { schema, seed, files, tables? }. Returns one result per file. */
export function run(job) {
  return job.files.map((f) => runFile(job, f))
}
