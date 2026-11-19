// Shared grading for every sql-basics issue. Each issue keeps its own schema and seeds in grader/,
// and the reference answers are the issue's solution/ files.
import { join } from 'node:path'

const child = join(import.meta.dirname, 'sql-child.mjs')
const SEEDS = ['seed.sql', 'hidden-seed.sql']
const SHOWN_ROWS = 10

const show = (v) => (v === null ? 'NULL' : typeof v === 'string' ? `'${v}'` : String(v))
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
const norm = (v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v)
const key = (row) => JSON.stringify(row.map(norm))

export function formatTable(columns, rows) {
  const cells = rows.slice(0, SHOWN_ROWS).map((row) => row.map((v) => (v === null ? 'NULL' : String(v))))
  const widths = columns.map((c, i) => Math.max(c.length, ...cells.map((r) => r[i].length)))
  const line = (values) => values.map((v, i) => v.padEnd(widths[i])).join(' | ').trimEnd()
  const more = rows.length > SHOWN_ROWS ? `... ${rows.length} rows in total` : `(${plural(rows.length, 'row')})`
  return [line(columns), widths.map((w) => '-'.repeat(w)).join('-+-'), ...cells.map(line), more].join('\n')
}

async function runSql(t, seed, files, tables) {
  const job = {
    schema: t.chapterPath('grader/schema.sql'),
    seed: t.chapterPath(`grader/${seed}`),
    files,
    tables
  }
  const r = await t.call(t.workspace, child, 'run', [job])
  if (r.timedOut) {
    const error = 'Your SQL ran for more than 15 seconds and was stopped. Look for a query that never ends.'
    return files.map(() => ({ error }))
  }
  if (!r.ok) throw new Error(r.error)
  return r.value
}

const describe = (columns, row) => columns.map((c, i) => `${c} = ${show(row[i])}`).join(', ')

function wrongValue(columns, mine, want, label) {
  const i = columns.findIndex((_, c) => key([mine[c]]) !== key([want[c]]))
  return `${label} has the wrong ${columns[i]}: yours is ${show(mine[i])}.`
}

/** Compares two results; returns null when they match, or a plain message saying what differs. */
export function diffResult(want, got, ordered) {
  const missing = want.columns.filter((c) => !got.columns.includes(c))
  const extra = got.columns.filter((c) => !want.columns.includes(c))
  if (missing.length || extra.length) {
    return [
      missing.length ? `Missing ${missing.length === 1 ? 'column' : 'columns'}: ${missing.join(', ')}.` : '',
      extra.length ? `Columns that should not be there: ${extra.join(', ')}.` : '',
      'Check the names in your SELECT list, including aliases set with AS.'
    ].filter(Boolean).join(' ')
  }
  const { columns } = want
  const order = columns.map((c) => got.columns.indexOf(c))
  const rows = got.rows.map((r) => order.map((i) => r[i]))
  const wanted = new Map()
  for (const r of want.rows) wanted.set(key(r), (wanted.get(key(r)) ?? 0) + 1)
  const unexpected = rows.filter((r) => {
    const n = wanted.get(key(r)) ?? 0
    if (n > 0) wanted.set(key(r), n - 1)
    return n === 0
  })

  if (rows.length !== want.rows.length) {
    const head = `Your result has ${plural(rows.length, 'row')}; it should have ${want.rows.length}.`
    if (rows.length > want.rows.length) {
      const stray = unexpected.find((r) => !want.rows.some((w) => key([w[0]]) === key([r[0]])))
      const example = stray ? ` For example, this row should not be there: ${describe(columns, stray)}.` : ''
      return `${head} Some rows get through that should be filtered out or cut off.${example}`
    }
    return `${head} Some rows are being left out: check your conditions, joins and limits.`
  }
  if (unexpected.length === 0) {
    if (!ordered || rows.every((r, i) => key(r) === key(want.rows[i]))) return null
    return 'The right rows, in the wrong order. Check your ORDER BY: which columns, in which order, and ASC or DESC.'
  }
  if (ordered) {
    const i = rows.findIndex((r, n) => key(r) !== key(want.rows[n]))
    if (key([rows[i][0]]) === key([want.rows[i][0]])) {
      return wrongValue(columns, rows[i], want.rows[i], `Row ${i + 1} (${columns[0]} = ${show(rows[i][0])})`)
    }
    return `Row ${i + 1} is not the row expected there. Yours is: ${describe(columns, rows[i])}. Check your conditions and your ORDER BY.`
  }
  const bad = unexpected[0]
  const twin = want.rows.find((r) => key([r[0]]) === key([bad[0]]) && !rows.some((m) => key(m) === key(r)))
  if (twin) return wrongValue(columns, bad, twin, `The row where ${columns[0]} is ${show(bad[0])}`)
  return `This row should not be in the result: ${describe(columns, bad)}. Another row is missing in its place.`
}

const HIDDEN = 'On a second dataset with different cafes, products and orders: '
const HARD_CODED =
  ' Your SQL works on the shipped data, so look for a condition that only happens to fit it, or a value copied from it (an id, name, date or total) that the query should work out itself.'

function emptyOrError(mine, file) {
  if (mine.empty) {
    return {
      name: `${file} has SQL in it`,
      passed: false,
      message: `${file} has no SQL statement yet, only comments. Write your SQL below the comment block.`
    }
  }
  if (mine.error) {
    return {
      name: 'The SQL runs',
      passed: false,
      message: `SQLite stopped with an error. Read it, fix that statement and try it with node run.mjs ${file}.`,
      output: mine.error
    }
  }
  return null
}

const detail = (name, message, output) => ({ name, passed: !message, message: message ?? undefined, output })

/** A SELECT task: the last result in the file must match the reference on both seeds. */
export async function checkQuery(t, file, { ordered = false } = {}) {
  const files = [join(t.workspace, file), t.chapterPath(`solution/${file}`)]
  const [[mine, want], [hiddenMine, hiddenWant]] = await Promise.all(SEEDS.map((s) => runSql(t, s, files)))
  const stop = emptyOrError(mine, file)
  if (stop) return [stop]
  if (mine.columns.length === 0) {
    return [
      {
        name: 'The file returns rows',
        passed: false,
        message: 'Your SQL ran but no statement returned rows. The task asks for a SELECT.'
      }
    ]
  }
  const shown = diffResult(want, mine, ordered)
  const hidden = hiddenMine.error ? hiddenMine.error : diffResult(hiddenWant, hiddenMine, ordered)
  return [
    { name: 'The SQL runs', passed: true },
    detail('Matches the expected rows on the shipped data', shown, formatTable(mine.columns, mine.rows)),
    detail(
      'Matches the expected rows on a hidden dataset',
      hidden && HIDDEN + hidden + (shown ? '' : HARD_CODED),
      hiddenMine.columns ? formatTable(hiddenMine.columns, hiddenMine.rows) : hiddenMine.error
    )
  ]
}

function diffTables(want, got) {
  for (const table of Object.keys(want.tables)) {
    const message = diffResult(want.tables[table], got.tables[table], false)
    if (message) return { table, message: `In the ${table} table: ${message}` }
  }
  return null
}

const tableOutput = (r, table) => (r.tables ? `${table} after your SQL:\n${formatTable(r.tables[table].columns, r.tables[table].rows)}` : r.error)

/**
 * A change task: after running the file, the listed tables must hold the same rows as after the
 * reference, on both seeds. `extra(mine, want)` can add task-specific details.
 */
export async function checkChange(t, file, { tables, extra }) {
  const files = [join(t.workspace, file), t.chapterPath(`solution/${file}`)]
  const [[mine, want], [hiddenMine, hiddenWant]] = await Promise.all(SEEDS.map((s) => runSql(t, s, files, tables)))
  const stop = emptyOrError(mine, file)
  if (stop) return [stop]
  const shown = diffTables(want, mine)
  const hidden = hiddenMine.error ? { message: hiddenMine.error, table: tables[0] } : diffTables(hiddenWant, hiddenMine)
  return [
    { name: 'The SQL runs', passed: true },
    detail(
      'Tables hold the expected rows on the shipped data',
      shown?.message,
      tableOutput(mine, shown?.table ?? tables[0])
    ),
    detail(
      'Tables hold the expected rows on a hidden dataset',
      hidden && HIDDEN + hidden.message + (shown ? '' : HARD_CODED),
      tableOutput(hiddenMine, hidden?.table ?? tables[0])
    ),
    ...(extra ? extra(mine, want) : [])
  ]
}
