// Grading for every sql-foundations issue. The data you can see is the issue's starter/seed.sql, the
// hidden data is hidden-seed.sql beside this file, and the expected rows come from solution/.
import { join } from 'node:path'

const child = join(import.meta.dirname, 'sql-child.mjs')
const HIDDEN_SEED = join(import.meta.dirname, 'hidden-seed.sql')
const SHOWN_ROWS = 12
const CHANGES = ['INSERT', 'UPDATE', 'DELETE', 'REPLACE', 'DROP', 'CREATE', 'ALTER', 'WITH']

const show = (v) => (v === null ? 'NULL' : typeof v === 'string' ? `'${v}'` : String(v))
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
const norm = (v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v)
const key = (row) => JSON.stringify(row.map(norm))
const describe = (columns, row) => columns.map((c, i) => `${c} = ${show(row[i])}`).join(', ')

export function formatTable(result) {
  if (!result.columns) return undefined
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
  if (mine.unreadable) {
    return fail('The file is there', `${file} could not be read. Did you rename, move or delete it?`)
  }
  if (mine.empty) {
    return fail(
      'The file has a query',
      `${file} is empty: it has no query yet, only comments. Write your query below the comments.`
    )
  }
  if (mine.count) {
    return fail(
      'The file has one query',
      `${file} has ${mine.count} statements. Check reads one query per file, so keep only the one that answers the task and remove the others.`
    )
  }
  if (mine.refused) {
    const changes = CHANGES.includes(mine.refused)
    const start = mine.refused === 'WITH' ? 'Your query tries to change the data.' : `Your query starts with ${mine.refused}${changes ? ', which changes the data' : ', not SELECT'}.`
    return fail(
      'The query only reads',
      `${start} In this issue a query only reads, so the file holds one query that starts with SELECT. Check did not run it, and nothing was changed.`
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
      'Your query returned more than 1000 rows, far more than any table here holds. Look for a part of it that repeats rows.'
    )
  }
  return null
}

/** Likely causes of wrong rows, read from the query. `values` is every text in the data, or null for hidden data. */
function hints(mine, missing, unexpected, values) {
  const found = []
  const code = mine.code.toLowerCase()
  const plain = /\bwhere\b/.test(code) && !mine.literals.some((lit) => lit.trim().toUpperCase() === 'NULL')
    ? mine.literals.filter((lit) => /[a-z]/i.test(lit) && !/[%_]/.test(lit) && !/^\d{4}-\d\d-\d\d$/.test(lit))
    : []
  const same = (v, lit) => v.toLowerCase() === lit.trim().toLowerCase()
  const wrongCase = values ? plain.find((lit) => !values.includes(lit) && values.some((v) => same(v, lit))) : undefined
  const unknown = values ? plain.find((lit) => !values.some((v) => same(v, lit))) : undefined
  const where = /\bwhere\b/.test(code)
  if (where && mine.literals.some((lit) => lit.trim().toUpperCase() === 'NULL')) {
    found.push(`'NULL' in quotes is text made of four letters, not a missing value.`)
  } else if (where && mine.literals.includes('')) {
    found.push(`Your query compares with empty text '', but an empty cell holds NULL, which is not text at all.`)
  } else if (wrongCase !== undefined) {
    found.push(
      `Your query looks for '${wrongCase}', but the data never spells it exactly that way. In SQLite, comparing text with = or <> is exact, capital letters and spaces included.`
    )
  } else if (unknown !== undefined && !/\blike\b/.test(code)) {
    found.push(`Your query looks for '${unknown}', which never appears in the data. Compare its spelling with seed.sql.`)
  }
  if (/\b\d{4}\s*-\s*\d{1,2}\s*-\s*\d{1,2}\b/.test(code)) {
    found.push(
      'A date without quotes is a sum to SQLite: 2026-10-01 means 2026 minus 10 minus 1. Dates here are text, so they go in single quotes.'
    )
  }
  if (/\bdistinct\b/.test(code)) {
    found.push('DISTINCT removes rows that repeat, and this task keeps every row, repeats included.')
  }
  if (/\b([\w.]+)\s*(<>|!=)\s*''[^()]*?\bor\s+\1\s*(<>|!=)/.test(code)) {
    found.push(
      'With OR, a row passes when any one part is true. Every value is unequal to at least one of two different values, so that condition keeps every row.'
    )
  }
  if (/(=|<>|!=)\s*null\b|\bnull\s*(=|<>|!=)/.test(code)) {
    found.push(
      'A comparison like = NULL is never true, not even for an empty cell, so it matches nothing. An empty cell has a test of its own, which the lesson shows.'
    )
  }
  if (/\b([\w.]+)\s*=\s*''[^()]*?\band\s+\1\s*=\s*''/.test(code)) {
    found.push(
      'Your condition asks for one column to equal two different values with AND. A row holds one value in each column, so that is never true for any row.'
    )
  }
  const withoutBetween = code.replace(/\bbetween\b[\s\S]*?\band\b/g, ' ')
  if (/\band\b/.test(withoutBetween) && /\bor\b/.test(withoutBetween) && !code.includes('(')) {
    found.push(
      'Your condition mixes AND and OR without brackets. SQLite works out AND before OR, so the parts may not pair up the way you meant.'
    )
  }
  if (missing.length && !unexpected.length && missing.every((r) => r.includes(null)) && !/\bis\s+(not\s+)?null\b/.test(code)) {
    found.push(
      'Every row left out has an empty cell (NULL) in it. A comparison with an empty cell is never true, so such a row drops out of a condition without a word.'
    )
  }
  return found
}

/** True when a column in the SELECT list is two bare names in a row, which a missing comma causes. */
function twoNames(code) {
  const list = code.match(/\bselect\b([\s\S]*?)\bfrom\b/i)?.[1] ?? ''
  return list.split(',').some((part) => /^\s*[\w.]+\s+[\w"]+\s*$/.test(part) && !/^\s*distinct\b/i.test(part))
}

/** Compares a result with the expected one; returns null when they match, or what differs in plain words. */
function compare(want, mine, values) {
  if (!mine.columns) return problem(mine, 'The file').message
  if (!/\bfrom\b/i.test(mine.code)) {
    return 'Your query has no FROM, so it reads no table: its values were typed in by hand and only fit the rows you can see. Ask the table for them instead.'
  }
  const wanted = want.columns.map((c) => c.toLowerCase())
  const got = mine.columns.map((c) => c.toLowerCase())
  const missingCols = want.columns.filter((c, i) => !got.includes(wanted[i]))
  const extraCols = mine.columns.filter((c, i) => !wanted.includes(got[i]))
  if (missingCols.length || extraCols.length) {
    const star = /\bselect\s+(distinct\s+)?\*/i.test(mine.code)
    let note = 'Check the names after SELECT, including any new name you give a column with AS, and the table after FROM.'
    if (star && !missingCols.length) note = '* brings every column of the table, and this task asks for only some of them.'
    else if (got.length < wanted.length && twoNames(mine.code)) {
      note = 'If two names sit next to each other with no comma between them, SQLite reads the second one as a new name for the first.'
    } else if (!extraCols.length) note = 'List every column the task asks for after SELECT, with a comma between each two.'
    return [
      missingCols.length ? `Missing ${missingCols.length === 1 ? 'column' : 'columns'}: ${missingCols.join(', ')}.` : '',
      extraCols.length ? `${extraCols.length === 1 ? 'A column' : 'Columns'} the task does not ask for: ${extraCols.join(', ')}.` : '',
      note
    ]
      .filter(Boolean)
      .join(' ')
  }
  if (got.length !== wanted.length) {
    return 'A column appears more than once in your result. List each column the task asks for once.'
  }
  if (got.some((c, i) => c !== wanted[i])) {
    return 'The right columns, in a different order. Columns come back in the order you list them after SELECT, so list them in the order the task gives.'
  }

  const counts = new Map()
  for (const r of mine.rows) counts.set(key(r), (counts.get(key(r)) ?? 0) + 1)
  const missing = want.rows.filter((r) => {
    const n = counts.get(key(r)) ?? 0
    if (n > 0) counts.set(key(r), n - 1)
    return n === 0
  })
  const unexpected = mine.rows.filter((r) => {
    const n = counts.get(key(r)) ?? 0
    if (n > 0) counts.set(key(r), n - 1)
    return n > 0
  })
  if (!missing.length && !unexpected.length) return null

  const { columns } = want
  const n = mine.rows.length
  const m = want.rows.length
  let message
  if (n > m) {
    message = `Your result has ${plural(n, 'row')}; it should have ${m}. Some rows get through that the task leaves out. For example, this row should not be there: ${describe(columns, unexpected[0])}.`
  } else if (n < m) {
    message = `Your result has ${plural(n, 'row')}; it should have ${m}. Some rows that belong are left out: look at your condition.`
  } else {
    const bad = unexpected[0]
    const twin = missing.find((r) => r.filter((v, i) => key([v]) !== key([bad[i]])).length === 1)
    if (twin) {
      const col = columns.findIndex((_, i) => key([twin[i]]) !== key([bad[i]]))
      message = `One row has the wrong ${columns[col]}: yours is ${show(bad[col])}. Look at how that column is worked out.`
    } else {
      message = `This row should not be in the result: ${describe(columns, bad)}. Another row belongs in its place: look at your condition.`
    }
  }
  return [message, ...hints(mine, missing, unexpected, values)].join(' ')
}

const HIDDEN = 'On a second set of data that Check keeps hidden, with other owners and animals: '
const FITS_ONLY =
  ' Your query works on the data you can see, so look for a value copied from it (a name, an id, a number) or a condition that only happens to fit those rows.'

const detail = (name, message, output) => ({ name, passed: !message, message: message ?? undefined, output })

async function runSql(t, seed, files) {
  const job = { schema: t.chapterPath('starter/schema.sql'), seed, files }
  const r = await t.call(t.workspace, child, 'run', [job])
  if (r.timedOut) return null
  if (!r.ok) throw new Error(r.error)
  return r.value
}

/** A reading task: the one query in the file must return the solution's rows, on both sets of data. */
export async function checkQuery(t, file) {
  const files = [join(t.workspace, file), t.chapterPath(`solution/${file}`)]
  const [shown, hidden] = await Promise.all(
    [t.chapterPath('starter/seed.sql'), HIDDEN_SEED].map((seed) => runSql(t, seed, files))
  )
  if (!shown || !hidden) {
    return [
      detail(
        'The query finishes',
        'Your query ran for more than 15 seconds and was stopped. Look for a part of it that never ends.'
      )
    ]
  }
  const [mine, want] = shown.results
  const stop = problem(mine, file)
  if (stop) return [stop]
  const [hiddenMine, hiddenWant] = hidden.results
  const seen = compare(want, mine, shown.values)
  const unseen = compare(hiddenWant, hiddenMine, null)
  return [
    { name: 'The query runs', passed: true },
    detail('Returns the right rows from the data you can see', seen, formatTable(mine)),
    detail(
      'Returns the right rows from hidden data',
      unseen && (seen ? 'Not yet: fix the result on the data you can see first.' : HIDDEN + unseen + FITS_ONLY)
    )
  ]
}
