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
  if (mine.refused !== undefined) {
    const changes = CHANGES.includes(mine.refused)
    const start = mine.refused === 'WITH' || !mine.refused ? 'Your query tries to change the data.' : `Your query starts with ${mine.refused}${changes ? ', which changes the data' : ', not SELECT'}.`
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
  const litsBefore = (i) => (code.slice(0, i).match(/''/g) ?? []).length
  const whereAt = code.search(/\bwhere\b/)
  const conditionLits = whereAt === -1 ? [] : mine.literals.slice(litsBefore(whereAt))
  const plain = whereAt !== -1 && !conditionLits.some((lit) => lit.trim().toUpperCase() === 'NULL')
    ? conditionLits.filter((lit) => /[a-z]/i.test(lit) && !/[%_]/.test(lit) && !/^\d{4}-\d\d-\d\d$/.test(lit))
    : []
  const same = (v, lit) => v.toLowerCase() === lit.trim().toLowerCase()
  const wrongCase = values ? plain.find((lit) => !values.includes(lit) && values.some((v) => same(v, lit))) : undefined
  const unknown = values ? plain.find((lit) => !values.some((v) => same(v, lit))) : undefined
  const where = /\bwhere\b/.test(code)
  const aggregate = /\b(count|sum|avg|min|max|total)\s*\(/.test(code)
  const grouped = /\bgroup\s+by\b/.test(code)
  const wanted = mine.rows.length - unexpected.length + missing.length
  if (where && conditionLits.some((lit) => lit.trim().toUpperCase() === 'NULL')) {
    found.push(`'NULL' in quotes is text made of four letters, not a missing value.`)
  } else if (where && conditionLits.includes('')) {
    found.push(`Your query compares with empty text '', but an empty cell holds NULL, which is not text at all.`)
  } else if (wrongCase !== undefined) {
    found.push(
      `Your query looks for '${wrongCase}', but the data never spells it exactly that way. In SQLite, comparing text with =, <> or IN is exact, capital letters and spaces included.`
    )
  } else if (unknown !== undefined && !/\blike\b/.test(code)) {
    found.push(`Your query looks for '${unknown}', which never appears in the data. Compare its spelling with seed.sql.`)
  }
  if (/\b\d{4}\s*-\s*\d{1,2}\s*-\s*\d{1,2}\b/.test(code)) {
    found.push(
      'A date without quotes is a sum to SQLite: 2026-10-01 means 2026 minus 10 minus 1. Dates here are text, so they go in single quotes.'
    )
  }
  if (/(=|<>|!=)\s*''/.test(code) && conditionLits.some((lit) => lit.includes('%')) && !/\blike\b/.test(code)) {
    found.push('% stands for any run of characters only in a LIKE pattern. With = it is just a percent sign.')
  }
  if (/\blike\s*''/.test(code) && missing.length && !conditionLits.some((lit) => /[%_]/.test(lit))) {
    found.push('A LIKE pattern with no % in it matches whole values only, as = does.')
  }
  for (const m of code.matchAll(/\bbetween\s*(?:''\s*and\s*''|(-?[\d.]+)\s*and\s*(-?[\d.]+))/g)) {
    const [low, high] = m[1] === undefined ? mine.literals.slice(litsBefore(m.index)) : [Number(m[1]), Number(m[2])]
    if (low > high) {
      found.push('BETWEEN takes the smaller limit first. With the larger one first, no value falls between them.')
      break
    }
  }
  if (!aggregate && /\bdistinct\b/.test(code)) {
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
  if (missing.length && !unexpected.length && missing.every((r) => r.includes(null)) && !/\bis\s+(not\s+)?null\b|(=|<>|!=)\s*null\b/.test(code)) {
    found.push(
      'Every row left out has an empty cell (NULL) in it. A comparison with an empty cell is never true, so such a row drops out of a condition without a word.'
    )
  }
  if (aggregate && !grouped && mine.rows.length === 1 && wanted > 1) {
    found.push('Without GROUP BY, a count or a total squeezes every row of the table into one.')
  }
  if (grouped && (mine.rows.length !== wanted || whereAt !== -1)) {
    found.push(
      'Look at the columns after GROUP BY, which decide what counts as one group, and at each condition: WHERE picks single rows before they are grouped, HAVING picks whole groups after.'
    )
  }
  if (aggregate && unexpected.some((r) => r.includes(null)) && missing.some((r) => r.includes(0))) {
    found.push('When no rows match, COUNT gives 0, but SUM, AVG, MIN and MAX give NULL.')
  }
  if (/\bsum\s*\([^)]*\)\s*\/\s*count\s*\(\s*\*\s*\)|\bavg\s*\(\s*(coalesce|ifnull)\s*\(/.test(code)) {
    found.push('AVG skips empty cells. Dividing by COUNT(*), or turning the gaps into 0 first, counts every empty cell as a 0 and pulls the average down.')
  }
  return found
}

/** Likely causes of rows in the wrong order, for a task that asks for one. */
function orderHints(mine, wantRows, missing, unexpected) {
  const found = []
  const code = mine.code.toLowerCase()
  const clause = code.split(/\border\s+by\b/)[1]
  const limit = /\blimit\b/.test(code)
  if (clause === undefined) {
    found.push(
      limit
        ? 'Your query has no ORDER BY, so the rows come back in no particular order and LIMIT keeps whichever come first.'
        : 'Your query has no ORDER BY, so the rows come back in no particular order.'
    )
  } else if (clause.split(',').some((part) => /^\s*''\s*(asc|desc)?\s*(limit\b.*)?$/.test(part))) {
    found.push('In ORDER BY, a name in single quotes is text, the same for every row, so it sorts nothing.')
  }
  const nullFirst = (rows) => rows.length > 0 && rows[0].includes(null)
  const nullsLetIn = limit && unexpected.some((r) => r.includes(null)) && !missing.some((r) => r.includes(null))
  const nullsMoved = !missing.length && nullFirst(mine.rows) !== nullFirst(wantRows)
  if (nullsLetIn || nullsMoved) {
    found.push(
      'SQLite counts an empty cell (NULL) as smaller than any value, so it comes first when the smallest come first, and last when the largest do.'
    )
  }
  if (limit && clause !== undefined && missing.length && missing.length === unexpected.length) {
    found.push('With LIMIT, the order decides which rows make the cut: look at what you sort by, its direction, and how rows with the same value are ordered.')
  }
  return found
}

/** What is wrong with the order of rows that are otherwise right, or null when it is right too. */
function outOfOrder(want, mine, hidden) {
  const same = (a, b) => a.every((r, i) => key(r) === key(b[i]))
  if (same(mine.rows, want.rows)) return null
  const look = 'Look at the columns you sort by, the order you list them in, and the direction of each.'
  let message
  if (!/\border\s+by\b/i.test(mine.code)) {
    message = 'The right rows, in a different order.'
  } else if (same([...mine.rows].reverse(), want.rows)) {
    message = 'The right rows, in the opposite order. Look at the direction of your sort.'
  } else if (hidden) {
    message = `The right rows, in a different order. ${look}`
  } else {
    const i = mine.rows.findIndex((r, j) => key(r) !== key(want.rows[j]))
    message = `The right rows, in a different order. Row ${i + 1} should be ${describe(want.columns, want.rows[i])}, and yours is ${describe(want.columns, mine.rows[i])}. ${look}`
  }
  return [message, ...orderHints(mine, want.rows, [], [])].join(' ')
}

/** True when a column in the SELECT list is two bare names in a row, which a missing comma causes. */
function twoNames(code) {
  const list = code.match(/\bselect\b([\s\S]*?)\bfrom\b/i)?.[1] ?? ''
  return list.split(',').some((part) => /^\s*[\w.]+\s+[\w"]+\s*$/.test(part) && !/^\s*distinct\b/i.test(part))
}

/** The expected row that differs from `bad` in exactly one column, if any. */
const twinOf = (missing, bad) => missing.find((r) => r.filter((v, i) => key([v]) !== key([bad[i]])).length === 1)

/** Compares a result with the expected one; returns null when they match, or what differs in plain words. */
function compare(want, mine, values, ordered = false) {
  const hidden = values === null
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
  if (!missing.length && !unexpected.length) return ordered ? outOfOrder(want, mine, hidden) : null

  const { columns } = want
  const aggregate = /\b(count|sum|avg|min|max|total)\s*\(/i.test(mine.code)
  const grouped = /\bgroup\s+by\b/i.test(mine.code)
  const condition = grouped ? '.' : ': look at your condition.'
  const n = mine.rows.length
  const m = want.rows.length
  let message
  if (n > m) {
    message = `Your result has ${plural(n, 'row')}; it should have ${m}. Some rows get through that the task leaves out${hidden ? condition : `. For example, this row should not be there: ${describe(columns, unexpected[0])}.`}`
  } else if (n < m) {
    const squeezed = n === 1 && aggregate && !grouped
    message = `Your result has ${plural(n, 'row')}; it should have ${m}. Some rows that belong are left out${squeezed ? '.' : condition}`
  } else if (hidden && (ordered || !aggregate || !twinOf(missing, unexpected[0]))) {
    message = ordered
      ? 'Your result has the right number of rows, but some of them are not the ones the task asks for.'
      : 'Your result has the right number of rows, but some of them are not the ones the task asks for: look at your condition, and at how each column is worked out.'
  } else {
    const bad = unexpected[0]
    const twin = twinOf(missing, bad)
    if (hidden) {
      const col = columns.findIndex((_, i) => key([twin[i]]) !== key([bad[i]]))
      message = `${unexpected.length === 1 ? 'One row has' : `${unexpected.length} rows have`} the wrong ${columns[col]}. Look at how that column is worked out.`
    } else if (ordered) {
      message = `This row should not be in the result: ${describe(columns, bad)}. Another row belongs in its place.`
    } else if (twin) {
      const col = columns.findIndex((_, i) => key([twin[i]]) !== key([bad[i]]))
      const wrong = unexpected.length === 1 ? 'One row has' : `${unexpected.length} rows have`
      message = `${wrong} the wrong ${columns[col]}. One of yours is ${show(bad[col])}. Look at how that column is worked out.`
    } else {
      message = `This row should not be in the result: ${describe(columns, bad)}. Another row belongs in its place: look at your condition${aggregate ? ', and at how each column is worked out' : ''}.`
    }
  }
  const extra = ordered ? orderHints(mine, want.rows, missing, unexpected) : []
  return [message, ...hints(mine, missing, unexpected, values), ...extra].join(' ')
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

/**
 * A reading task: the one query in the file must return the solution's rows, on both sets of data.
 * With `ordered`, the rows must also come in the solution's order.
 */
export async function checkQuery(t, file, { ordered = false } = {}) {
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
  const seen = compare(want, mine, shown.values, ordered)
  const unseen = compare(hiddenWant, hiddenMine, null, ordered)
  return [
    { name: 'The query runs', passed: true },
    detail('Returns the right rows from the data you can see', seen, formatTable(mine)),
    detail(
      'Returns the right rows from hidden data',
      unseen && (seen ? 'Not yet: fix the result on the data you can see first.' : HIDDEN + unseen + FITS_ONLY)
    )
  ]
}
