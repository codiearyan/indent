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

/** job: { schema, seed, files }. Returns one result per file, and every text value in the data. */
export function run(job) {
  const db = new DatabaseSync(':memory:')
  db.exec(readFileSync(job.schema, 'utf8'))
  db.exec(readFileSync(job.seed, 'utf8'))
  db.exec('PRAGMA query_only = ON')
  const results = job.files.map((f) => runFile(db, f))
  const values = textValues(db)
  db.close()
  return { results, values }
}
