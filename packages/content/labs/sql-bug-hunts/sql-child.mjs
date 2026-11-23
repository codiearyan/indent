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

function runText(db, source) {
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

function runFile(db, file) {
  let source
  try {
    source = readFileSync(file, 'utf8')
  } catch {
    return { unreadable: true }
  }
  return runText(db, source)
}

function load(job) {
  const db = new DatabaseSync(':memory:')
  db.exec(readFileSync(job.schema, 'utf8'))
  db.exec(readFileSync(job.seed, 'utf8'))
  return db
}

const tablesOf = (db) =>
  db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite%'").all().map((r) => r.name)

/**
 * The same rows with every id turned round (the last becomes the first) and every column that points
 * at another table's id, such as customer_id, turned round with it. Nothing else changes, so a query
 * that does not depend on how rows happen to be stored returns the same answer.
 */
function reversed(job) {
  const from = load(job)
  const to = new DatabaseSync(':memory:')
  to.exec(readFileSync(job.schema, 'utf8'))
  const top = {}
  for (const name of tablesOf(from)) top[name] = from.prepare(`SELECT MAX(id) AS n FROM "${name}"`).get().n ?? 0
  for (const name of tablesOf(from)) {
    const columns = from.prepare(`SELECT name FROM pragma_table_info('${name}')`).all().map((c) => c.name)
    const turn = columns.map((c) => (c === 'id' ? name : c.endsWith('_id') ? `${c.slice(0, -3)}s` : null))
    const insert = to.prepare(`INSERT INTO "${name}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`)
    const read = from.prepare(`SELECT * FROM "${name}" ORDER BY id DESC`)
    read.setReturnArrays(true)
    for (const row of read.iterate()) {
      insert.run(...row.map((v, i) => (turn[i] && v !== null && top[turn[i]] !== undefined ? top[turn[i]] + 1 - v : v)))
    }
  }
  from.close()
  return to
}

/**
 * job: { schema, seed, files, sqls?, reverse? }. Returns one result per file, one per SQL text, every
 * value of a name column, and with `reverse` the first file's result on the same data with its ids turned round.
 */
export function run(job) {
  const db = load(job)
  db.exec('PRAGMA query_only = ON')
  const results = job.files.map((f) => runFile(db, f))
  const variants = (job.sqls ?? []).map((sql) => runText(db, sql))
  const named = tablesOf(db).filter((t) => db.prepare(`SELECT 1 FROM pragma_table_info('${t}') WHERE name = 'name'`).get())
  const names = [...new Set(named.flatMap((t) => db.prepare(`SELECT name FROM "${t}"`).all().map((r) => r.name)))]
  db.close()
  let turned
  if (job.reverse) {
    const other = reversed(job)
    other.exec('PRAGMA query_only = ON')
    turned = runFile(other, job.files[0])
    other.close()
  }
  return { results, variants, turned, names }
}
