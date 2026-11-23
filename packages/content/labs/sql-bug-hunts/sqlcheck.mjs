// Grading for every sql-bug-hunts issue. The data you can see is the issue's starter/seed.sql, the
// hidden data is hidden-seed.sql beside this file, and the expected rows come from solution/. A task
// lists known wrong queries as variants: when the learner's rows match one, its cause is the message.
import { join } from 'node:path'

const child = join(import.meta.dirname, 'sql-child.mjs')
const HIDDEN_SEED = join(import.meta.dirname, 'hidden-seed.sql')
const SHOWN_ROWS = 12
const CHANGES = ['INSERT', 'UPDATE', 'DELETE', 'REPLACE', 'DROP', 'CREATE', 'ALTER']

const show = (v) => (v === null ? 'NULL' : typeof v === 'string' ? `'${v}'` : String(v))
const norm = (v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v)
const key = (row) => JSON.stringify(row.map(norm))
const describe = (columns, row) => columns.map((c, i) => `${c} = ${show(row[i])}`).join(', ')
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

export function formatTable(result) {
  if (!result?.columns) return undefined
  const { columns, rows } = result
  const cells = rows.slice(0, SHOWN_ROWS).map((row) => row.map((v) => (v === null ? 'NULL' : String(v))))
  const widths = columns.map((c, i) => Math.max(c.length, ...cells.map((r) => r[i].length)))
  const line = (values) => values.map((v, i) => v.padEnd(widths[i])).join(' | ').trimEnd()
  const more = rows.length > SHOWN_ROWS ? `... ${rows.length} rows in total` : `(${plural(rows.length, 'row')})`
  return [line(columns), widths.map((w) => '-'.repeat(w)).join('-+-'), ...cells.map(line), more].join('\n')
}

/** Why a file cannot be compared at all, or null when it returned rows. */
function problem(mine, file) {
  const fail = (name, message, output) => ({ name, passed: false, message, output })
  if (mine.unreadable) return fail('The file is there', `${file} could not be read. Did you rename, move or delete it?`)
  if (mine.empty) {
    return fail('The file has a query', `${file} has no query yet, only comments. Write your query below the comments.`)
  }
  if (mine.count) {
    return fail(
      'The file has one query',
      `${file} has ${mine.count} statements. Check reads one query per file, so keep only the one that answers the task and remove the others.`
    )
  }
  if (mine.refused !== undefined) {
    const start = mine.refused && !['WITH', 'SELECT'].includes(mine.refused)
      ? `Your file starts with ${mine.refused}${CHANGES.includes(mine.refused) ? ', which changes the data' : ', not SELECT'}.`
      : 'Your file tries to change the data or the database.'
    return fail(
      'The query only reads',
      `${start} A report only reads, so the file holds one query that starts with SELECT. Check did not run it, and nothing was changed.`
    )
  }
  if (mine.error) {
    return fail(
      'The query runs',
      `SQLite could not run your query, so this is a mistake in how the SQL is written, not a wrong result. Read the error below, fix the spot it points at, and run the file again with node run.mjs ${file}.`,
      `SQLite says: ${mine.error}\n  ${mine.line}`
    )
  }
  if (mine.tooMany) {
    return fail(
      'The query returns a sensible number of rows',
      'Your query returned more than 1000 rows, far more than any table here holds. Look for a JOIN whose ON does not pair the rows that belong together.'
    )
  }
  return null
}

const sameRows = (a, b, ordered) => {
  if (a.length !== b.length) return false
  if (ordered) return a.every((r, i) => key(r) === key(b[i]))
  const sort = (rows) => rows.map(key).sort()
  const [x, y] = [sort(a), sort(b)]
  return x.every((k, i) => k === y[i])
}

/** Rows of `a` with no partner in `b`, repeats counted. */
function without(a, b) {
  const left = new Map()
  for (const r of b) left.set(key(r), (left.get(key(r)) ?? 0) + 1)
  return a.filter((r) => {
    const n = left.get(key(r)) ?? 0
    if (n > 0) left.set(key(r), n - 1)
    return n === 0
  })
}

/** What differs between a result and the expected one, in words that never show an expected value. */
function difference(want, mine, seen, ordered) {
  const wanted = want.columns.map((c) => c.toLowerCase())
  const got = mine.columns.map((c) => c.toLowerCase())
  const missingCols = want.columns.filter((c, i) => !got.includes(wanted[i]))
  const extraCols = mine.columns.filter((c, i) => !wanted.includes(got[i]))
  if (missingCols.length || extraCols.length) {
    return {
      columns: true,
      text: [
        missingCols.length ? `Missing ${missingCols.length === 1 ? 'column' : 'columns'}: ${missingCols.join(', ')}.` : '',
        extraCols.length ? `${extraCols.length === 1 ? 'A column' : 'Columns'} the task does not ask for: ${extraCols.join(', ')}.` : '',
        'Check the names after SELECT, including the names you give with AS. The task lists each one.'
      ]
        .filter(Boolean)
        .join(' ')
    }
  }
  if (got.length !== wanted.length) return { columns: true, text: 'A column appears more than once in your result. List each column the task asks for once.' }
  if (got.some((c, i) => c !== wanted[i])) {
    return { columns: true, text: 'The right columns, in a different order. List them after SELECT in the order the task gives.' }
  }
  const missing = without(want.rows, mine.rows)
  const extra = without(mine.rows, want.rows)
  if (!missing.length && !extra.length) {
    if (!ordered || sameRows(mine.rows, want.rows, true)) return null
    return { order: true, text: 'The right rows, in a different order from the one the task asks for.' }
  }
  const { columns } = want
  if (mine.rows.length > want.rows.length) {
    return { text: `Your result has rows that do not belong.${seen && extra.length ? ` One of them: ${describe(columns, extra[0])}.` : ''}` }
  }
  if (mine.rows.length < want.rows.length) return { text: 'Your result leaves out rows that belong.' }
  // Pair each wrong row with the expected row that has the same first column, to name what is wrong in it.
  const partners = extra.map((r) => missing.find((w) => key([w[0]]) === key([r[0]])))
  const one = seen ? ` One of yours: ${describe(columns, extra[0])}.` : ''
  if (columns.length > 1 && partners.every(Boolean)) {
    const wrong = columns.filter((_, i) => i > 0 && extra.some((r, j) => key([r[i]]) !== key([partners[j][i]])))
    const n = extra.length
    return { text: `${n === 1 ? 'One row has a wrong value' : `${n} rows have wrong values`} in ${wrong.join(' and ')}.${one}` }
  }
  return { text: `Some of your rows are not the ones the task asks for.${one}` }
}

/** The cause of a wrong result: the first variant it matches, else what the code shows, else the fallback. */
function cause(mine, variants, list, opts, names) {
  if (mine.literals.some((lit) => names.includes(lit))) {
    return 'Your query names customers or seeds typed in by hand. Those names only fit the data you can see: the rule that picks the rows has to come from the data itself.'
  }
  const code = mine.code.toLowerCase().replace(/\s+/g, ' ')
  if (/\bid\s*(=|in\s*\()\s*\d/.test(code)) {
    return 'Your query picks rows by ids typed in by hand. Those ids only fit the data you can see: the rule that picks the rows has to come from the data itself.'
  }
  const alias = code.match(/\bproducts\s+(?:as\s+)?(?!on\b|join\b|where\b|left\b|group\b)(\w+)/)?.[1] ?? 'products'
  if (code.includes(`${alias}.price_pence`)) {
    return "The price of a seed changes over time. What an order came to uses the price on the day, kept on each line in order_lines.price_pence, not today's price in products."
  }
  if (!opts.ordered && /\blimit\b/.test(code)) {
    return 'LIMIT keeps only the first few rows, and this report has no first few: it lists every row the task describes.'
  }
  const found = opts.causes ? opts.causes(code, mine) : []
  const hit = list.findIndex((v, i) => variants[i]?.rows && (!v.when || v.when.test(code)) && sameRows(mine.rows, variants[i].rows, opts.ordered))
  const said = (f) => list[hit].cause.toLowerCase().includes(f.toLowerCase())
  if (hit !== -1) return [list[hit].cause, ...found.filter((f) => !said(f))].join(' ')
  return found.length ? found.join(' ') : opts.fallback
}

const HIDDEN = 'On hidden data that Check keeps, with other customers, seeds and orders: '
const FITS_ONLY =
  ' Your query works on the data you can see, so look for a value copied from it (a name, an id, a number, a date) or a fix that only mends the rows of the ticket.'
const TYPED =
  'Your query has no FROM, so it reads no table: its values were typed in by hand and only fit the rows you can see. Ask the tables for them instead.'

const detail = (name, message, output) => ({ name, passed: !message, message: message ?? undefined, output })

async function runSql(t, seed, files, sqls, reverse) {
  const job = { schema: t.chapterPath('starter/schema.sql'), seed, files, sqls, reverse }
  const r = await t.call(t.workspace, child, 'run', [job])
  if (r.timedOut) return null
  if (!r.ok) throw new Error(r.error)
  return r.value
}

/**
 * A reading task: the one query in the file must return the solution's rows, on the data you can see
 * and on hidden data. Options:
 * - `ordered`: the rows must also come in the solution's order.
 * - `stable`: the result must not change when the same rows are stored in another order (ties).
 * - `variants`: [{ sql, cause, when? }], wrong queries a learner is likely to write, with the cause to name.
 *   A variant whose rows match names its cause, if its `when` (a pattern on the query) matches too.
 * - `causes(code, mine)`: more causes read from the query (lower case, text values emptied).
 * - `fallback`: what to say when no cause is found.
 */
export async function checkQuery(t, file, opts = {}) {
  const { ordered = false, stable = false, variants = [] } = opts
  const files = [join(t.workspace, file), t.chapterPath(`solution/${file}`)]
  const sqls = variants.map((v) => v.sql)
  const [shown, hidden] = await Promise.all([
    runSql(t, t.chapterPath('starter/seed.sql'), files, sqls, stable),
    runSql(t, HIDDEN_SEED, files, sqls, stable)
  ])
  if (!shown || !hidden) {
    return [
      detail(
        'The query finishes',
        'Your query ran for more than 15 seconds and was stopped, so Check could not judge it. Look for a part of it that never ends.'
      )
    ]
  }
  const [mine, want] = shown.results
  const stop = problem(mine, file)
  if (stop) return [stop]
  if (!want.rows) throw new Error(`The solution of ${file} does not run: ${want.error ?? JSON.stringify(want)}`)

  const judge = (run, seen) => {
    const [m, w] = run.results
    if (!m.columns) return problem(m, file)?.message ?? 'Your query did not return rows.'
    if (!/\bfrom\b/i.test(m.code)) return TYPED
    const diff = difference(w, m, seen, ordered)
    if (!diff) return null
    if (diff.columns) return diff.text
    return `${diff.text} ${cause(m, run.variants, variants, opts, shown.names)}`
  }
  const seen = judge(shown, true)
  const unseen = judge(hidden, false)
  const details = [
    { name: 'The query runs', passed: true },
    detail('Returns the right rows from the data you can see', seen, formatTable(mine)),
    detail(
      'Returns the right rows from hidden data',
      unseen && (seen ? 'Not yet: fix the result on the data you can see first.' : HIDDEN + unseen + FITS_ONLY)
    )
  ]
  if (stable) {
    const moved = [shown, hidden].some((r) => r.turned?.rows && r.results[0].rows && !sameRows(r.turned.rows, r.results[0].rows, true))
    details.push(
      detail(
        'Gives the same answer however the rows are stored',
        moved
          ? 'Check stored the same rows again with their ids turned round, changing nothing else, and your query gave a different answer. When rows tie on what you sort by, the order SQLite happens to meet them in decides which ones LIMIT keeps, and an id only says in which order rows were typed in. Break ties by what the task names.'
          : null
      )
    )
  }
  return details
}
