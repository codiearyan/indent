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
const UNPAIRED =
  'A JOIN with no ON pairs every row of one table with every row of the other, so the rows multiply. Each join needs an ON that says which rows belong together.'
/** True when a query has more joins than ON or USING, or lists two tables after FROM with a comma and no WHERE. */
const unpaired = (code) =>
  (code.match(/\bjoin\b/g) ?? []).length > (code.match(/\b(on|using)\b/g) ?? []).length ||
  (/\bfrom\s+\w+(\s+(as\s+)?\w+)?\s*,/.test(code) && !/\bwhere\b/.test(code))

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
      `Your query returned more than 1000 rows, far more than any table here holds. Look for a part of it that repeats rows.${unpaired(mine.code.toLowerCase()) ? ` ${UNPAIRED}` : ''}`
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
  const joined = /\bjoin\b/.test(code)
  const left = /\bleft\s+(outer\s+)?join\b/.test(code)
  const condAt = code.search(/\b(where|on)\b/)
  const whereClause = whereAt === -1 ? '' : code.slice(whereAt)
  const testsNull = /\bis\s+null\b/.test(whereClause)
  const conditionLits = condAt === -1 ? [] : mine.literals.slice(litsBefore(condAt))
  const plain = condAt !== -1 && !conditionLits.some((lit) => lit.trim().toUpperCase() === 'NULL')
    ? conditionLits.filter((lit) => /[a-z]/i.test(lit) && !/[%_]/.test(lit) && !/^\d{4}-\d\d-\d\d$/.test(lit))
    : []
  const same = (v, lit) => v.toLowerCase() === lit.trim().toLowerCase()
  const wrongCase = values ? plain.find((lit) => !values.includes(lit) && values.some((v) => same(v, lit))) : undefined
  const unknown = values ? plain.find((lit) => !values.some((v) => same(v, lit))) : undefined
  const where = condAt !== -1
  const aggregate = /\b(count|sum|avg|min|max|total)\s*\(/.test(code)
  const grouped = /\bgroup\s+by\b/.test(code)
  const wanted = mine.rows.length - unexpected.length + missing.length
  const byId = grouped && /\bid\b/.test(code.split(/\bgroup\s+by\b/)[1])
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
  if (!joined && missing.length && !unexpected.length && missing.every((r) => r.includes(null)) && !/\bis\s+(not\s+)?null\b|(=|<>|!=)\s*null\b/.test(code)) {
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
  const squeezed = aggregate && !grouped
  if (mine.rows.length > wanted && unpaired(code)) {
    found.push(UNPAIRED)
  } else if (squeezed || (!aggregate && /\bselect\s+distinct\b/.test(code))) {
    // the hint about GROUP BY or DISTINCT above names the cause
  } else if (joined && !left && whereAt === -1 && mine.rows.length < wanted) {
    found.push(
      'A JOIN keeps only the rows that find a partner through ON. A row with no partner, or one that ON pairs with the wrong rows, drops out without a word.'
    )
  } else if (joined && !left && testsNull && mine.rows.length < wanted) {
    found.push(
      'A plain JOIN keeps no row without a partner, so a test for NULL in the other table\'s columns has nothing to find. Which join keeps those rows?'
    )
  } else if (left && (!grouped || byId) && (whereAt === -1 || (testsNull && !/\b(and|or)\b/.test(whereClause))) && mine.rows.length < wanted) {
    found.push(
      'A LEFT JOIN keeps every row of the table named before it, and pairs it with the rows ON finds. Look at which table comes first, and at which columns ON pairs.'
    )
  } else if (left && testsNull && !/\bor\b/.test(whereClause) && mine.rows.length > wanted) {
    found.push(
      'Some rows that did find a partner pass your test for NULL too: on a real row of the other table, the column you test can still be empty. Test one that is never empty there.'
    )
  }
  if (joined && !left && !grouped && values && unexpected.length && mine.rows.length === wanted) {
    found.push(
      'If a value comes from the other table, look at ON too: when it compares the wrong columns, each row is paired with one that is not its partner, and SQLite gives no error.'
    )
  }
  if (left && whereAt !== -1 && missing.length && !/\bis\s+(not\s+)?null\b|(=|<>|!=)\s*null\b/.test(whereClause)) {
    found.push(
      'WHERE runs after the join. On a row that a LEFT JOIN kept without a partner, every column of the other table is NULL, so a test on those columns is not true and the row drops out again.'
    )
  }
  const twin = unexpected.length ? twinOf(missing, unexpected[0]) : undefined
  const col = twin ? twin.findIndex((v, i) => key([v]) !== key([unexpected[0][i]])) : -1
  const [mineValue, wantValue] = col === -1 ? [] : [unexpected[0][col], twin[col]]
  if (joined && grouped && typeof mineValue === 'number' && typeof wantValue === 'number' && mineValue > wantValue) {
    found.push(
      left && wantValue === 0 && /\bcount\s*\(\s*\*\s*\)/.test(code)
        ? 'COUNT(*) counts rows, and a LEFT JOIN keeps one row for each row that has no partner, with NULL in the columns of the other table. That row counts as 1.'
        : 'After a join, a row of one table appears once for every partner it finds in the other, so a COUNT or a SUM over the joined rows can count the same thing more than once.'
    )
  }
  if (/\bsum\s*\(\s*distinct\b/.test(code)) {
    found.push('SUM(DISTINCT ...) adds each different value once, so two real charges of the same amount count as one.')
  }
  if (joined && grouped && !byId && mine.rows.length < wanted) {
    found.push(
      'Two owners, or two animals, can share a name, so a group made from names alone can hold two of them. What is different for every row of a table?'
    )
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
    message = `The right rows, in a different order. The first one out of place is row ${i + 1}: ${describe(want.columns, mine.rows[i])}. ${look}`
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

async function runSql(t, seed, files, more) {
  const job = { schema: t.chapterPath('starter/schema.sql'), seed, files, more }
  const r = await t.call(t.workspace, child, 'run', [job])
  if (r.timedOut) return null
  if (!r.ok) throw new Error(r.error)
  return r.value
}

/** True when the result has only wanted rows but repeats one of them. */
function repeats(mine, want) {
  const left = new Map()
  for (const r of want.rows) left.set(key(r), (left.get(key(r)) ?? 0) + 1)
  let extra = false
  for (const r of mine.rows) {
    const n = left.get(key(r))
    if (n === undefined) return false
    if (n === 0) extra = true
    else left.set(key(r), n - 1)
  }
  return extra
}
const REPEATS =
  'Every row of yours is one the task asks for, but some come more than once. A join repeats a row once for each partner it finds; IN only asks whether a value is in the list, so each row comes back once.'
const FIRST_ONLY =
  'With =, <, > and the like, a query in brackets stands for one value. When it returns several rows, this engine uses the first and says nothing; IN uses them all.'

/** A wrong result in the issue on subqueries, said again with what is most likely the cause. */
function subqueryNote(message, mine, want) {
  if (repeats(mine, want)) return `Your result has ${plural(mine.rows.length, 'row')}; it should have ${want.rows.length}. ${REPEATS}`
  const lists = [...mine.code.matchAll(/(=|<>|!=|<|>)\s*\(\s*select\b([\s\S]*?)\bfrom\b/gi)].map((m) => m[2])
  const several = lists.some((list) => !/\b(avg|count|sum|min|max|total)\s*\(/i.test(list))
  return several ? `${message} ${FIRST_ONLY}` : message
}

/**
 * A reading task: the one query in the file must return the solution's rows, on both sets of data.
 * With `ordered`, the rows must also come in the solution's order. `more` is a file of rows added to
 * the hidden data, and `subqueries` adds the notes of the issue on subqueries to a wrong result.
 */
export async function checkQuery(t, file, { ordered = false, more, subqueries = false } = {}) {
  const files = [join(t.workspace, file), t.chapterPath(`solution/${file}`)]
  const extra = more && [join(import.meta.dirname, more)]
  const [shown, hidden] = await Promise.all([
    runSql(t, t.chapterPath('starter/seed.sql'), files),
    runSql(t, HIDDEN_SEED, files, extra)
  ])
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
  const note = (message, m, w) => (message && subqueries ? subqueryNote(message, m, w) : message)
  const seen = note(compare(want, mine, shown.values, ordered), mine, want)
  const unseen = note(compare(hiddenWant, hiddenMine, null, ordered), hiddenMine, hiddenWant)
  return [
    { name: 'The query runs', passed: true },
    detail('Returns the right rows from the data you can see', seen, formatTable(mine)),
    detail(
      'Returns the right rows from hidden data',
      unseen && (seen ? 'Not yet: fix the result on the data you can see first.' : HIDDEN + unseen + FITS_ONLY)
    )
  ]
}

// The second kind of check, for the issues that change rows, make tables or make indexes. Every file
// runs on Check's own fresh copy of the data. For a change, the hidden data is the issue's own data
// with the rows of hidden-changes.sql added, so a WHERE that only fits the rows you can see shows up.

const HIDDEN_CHANGES = join(import.meta.dirname, 'hidden-changes.sql')
const ROWS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'BEGIN', 'COMMIT', 'END', 'ROLLBACK']
const TABLES = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE TABLE']
const INDEXES = ['SELECT', 'EXPLAIN', 'CREATE INDEX', 'CREATE UNIQUE INDEX', 'DROP INDEX']
const WRITES = ['INSERT', 'UPDATE', 'DELETE']
const ROWS_ARE = 'In this issue a file changes rows: it holds SELECT, INSERT, UPDATE and DELETE, and BEGIN, COMMIT and ROLLBACK.'
const TABLES_ARE = 'In this issue a file makes a table and tries rows in it: it holds CREATE TABLE, INSERT, UPDATE, DELETE and SELECT.'
const INDEXES_ARE = 'In this issue a file makes or removes indexes and reads plans: it holds CREATE INDEX, DROP INDEX, EXPLAIN QUERY PLAN and SELECT.'
const TOO_LONG = 'Your file ran for more than 15 seconds and was stopped. Look for a query in it that never ends.'

const ERRORS = [
  [/has \d+ columns but \d+ values/, () => 'Without a list of columns after the table name, INSERT needs a value for every column, id included, in the order schema.sql gives.'],
  [/\d+ values for \d+ columns/, () => 'The list of columns and the list of values must be the same length: one value for each column you name.'],
  [
    /NOT NULL constraint failed: \w+\.(\w+)/,
    (m, line) =>
      `The table's rules say ${m[1]} is never empty, and the row has no value for it.${/^\s*insert\s+into\s+\w+\s*\(/i.test(line) ? ' Look at the list of columns too: a value in the wrong place goes into another column.' : ''}`
  ],
  [/UNIQUE constraint failed: \w+\.id$/, () => 'That id is taken already. Leave id out and the database picks a free one.'],
  [
    /UNIQUE constraint failed: \w+\.\w+$/,
    (m, line) =>
      `Two rows share that value, and a rule says no two may.${/^\s*create\s+unique\s+index\b/i.test(line) ? ' A UNIQUE index cannot even be made while two rows already share a value.' : ''}`
  ],
  [/FOREIGN KEY constraint failed/, () => 'A row points at a row that is not there, in the table that REFERENCES names.'],
  [/foreign key mismatch/, () => "A column that points at another table points at that table's key."],
  [/unknown datatype/, () => 'A STRICT table knows only the types INTEGER (or INT), REAL, TEXT, BLOB and ANY.'],
  [/cannot rollback - no transaction/, () => 'ROLLBACK undoes a transaction, so a BEGIN has to come before the change.'],
  [/cannot commit - no transaction/, () => 'COMMIT ends a transaction, so a BEGIN has to come before the change.'],
  [/within a transaction/, () => 'A transaction is open already. End it with COMMIT or ROLLBACK before you start another.'],
  [/already exists/, () => 'Every table and index has a name of its own, and your file makes one with a name that is taken: the same one twice, or one schema.sql has.']
]
/** `line` is the learner's statement that failed, when it was theirs and not one of Check's own rows. */
const errorHint = (error, line = '') => {
  for (const [re, say] of ERRORS) {
    const m = error.match(re)
    if (m) return ` ${say(m, line)}`
  }
  return ''
}

async function runChange(t, job) {
  const r = await t.call(t.workspace, child, 'change', [job])
  if (r.timedOut) return null
  if (!r.ok) throw new Error(r.error)
  return r.value
}

/** Why a file of the second kind cannot be judged at all, or null when it ran. */
function halt(mine, file, allowed) {
  const fail = (name, message, output) => [{ name, passed: false, message, output }]
  if (mine.unreadable) return fail('The file is there', `${file} could not be read. Did you rename, move or delete it?`)
  if (mine.empty) return fail('The file has a statement', `${file} is empty: it has no statement yet, only comments.`)
  if (mine.refused !== undefined) {
    const keys = /foreign_keys/i.test(mine.line) ? ' Keys that point at another table are switched on already, in run.mjs and in Check.' : ''
    return fail(
      'The file holds only what this issue needs',
      `Your file has a statement that starts with ${mine.refused || 'something that is not SQL'}. ${allowed} Check did not run the file, and nothing was changed.${keys}`
    )
  }
  if (mine.error !== undefined) {
    return fail(
      'The file runs',
      `SQLite could not run statement ${mine.at} of your file, so Check stopped there.${errorHint(mine.error, mine.line)} Read the error below, fix that statement, and run the file again with node run.mjs ${file}.`,
      `SQLite says: ${mine.error}\n  ${mine.line}`
    )
  }
  return null
}

const sameRow = (a, b) => (a === undefined || b === undefined ? a === b : key(a) === key(b))
const kindOf = (before, after) => (before === undefined ? 'added' : after === undefined ? 'removed' : 'changed')
const unchanged = (start, state) =>
  Object.keys({ ...start, ...state }).every((t) => {
    const a = start[t]?.rows ?? {}
    const b = state[t]?.rows ?? {}
    return Object.keys({ ...a, ...b }).every((id) => sameRow(a[id], b[id]))
  })

/** What a file changed, in lines a person reads, for the data they can see. */
function formatChanges(start, state) {
  const lines = []
  for (const table of Object.keys(state)) {
    const { columns, rows } = state[table]
    const before = start[table]?.rows ?? {}
    for (const id of Object.keys({ ...before, ...rows })) {
      const [a, b] = [before[id], rows[id]]
      if (sameRow(a, b)) continue
      const kind = kindOf(a, b)
      if (kind === 'changed') {
        const diff = columns.flatMap((c, i) => (key([a[i]]) === key([b[i]]) ? [] : [`${c} ${show(a[i])} -> ${show(b[i])}`]))
        lines.push(`${table} id ${id} changed: ${diff.join(', ')}`)
      } else lines.push(`${table} id ${id} ${kind}: ${describe(columns, a ?? b)}`)
    }
  }
  if (!lines.length) return 'Your file left every row as it was.'
  const more = lines.length > SHOWN_ROWS ? [`... ${lines.length} rows in total`] : []
  return ['What your file changed in the data you can see:', ...lines.slice(0, SHOWN_ROWS), ...more].join('\n')
}

/** Why a WHERE caught rows it should not, read from the statements. `wrongRow` when it also missed one. */
function whereHint(code, wrongRow) {
  const writes = code.map((c) => c.toLowerCase()).filter((c) => /^\s*(update|delete)\b/.test(c))
  const bare = writes.find((c) => !/\bwhere\b/.test(c))
  if (bare) {
    return /^\s*update/.test(bare)
      ? 'An UPDATE with no WHERE changes every row of the table.'
      : 'A DELETE with no WHERE removes every row of the table.'
  }
  if (writes.some((c) => /\bwhere\b[\s\S]*\b(name|first_name|last_name)\s*(=|\blike\b|\bin\b)/.test(c) && !/\bid\s*=/.test(c))) {
    return 'Two rows can share a name, so a WHERE on a name can catch more than one. Pick the row by what is different for every row.'
  }
  return wrongRow
    ? 'Your WHERE picks a different row from the one the task is about. Run it as a SELECT first to see which row it picks.'
    : 'Your WHERE catches more rows than the task is about. Run it as a SELECT first to see which rows it picks.'
}

/**
 * Compares the state a file left with the solution's, both from `start`: the right rows changed, and no
 * other row changed. Returns null when they agree, or what differs in plain words.
 */
function compareRows(start, mineState, wantState, mine, seen) {
  const extra = []
  const missed = []
  for (const table of Object.keys({ ...start, ...mineState, ...wantState })) {
    const s = start[table]?.rows ?? {}
    const m = mineState[table]?.rows ?? {}
    const w = wantState[table]?.rows ?? {}
    const columns = (wantState[table] ?? start[table]).columns
    for (const id of Object.keys({ ...s, ...m, ...w })) {
      if (sameRow(w[id], s[id])) {
        if (!sameRow(m[id], s[id])) extra.push({ table, id, kind: kindOf(s[id], m[id]), row: m[id] })
      } else if (!sameRow(m[id], w[id])) missed.push({ table, id, columns, start: s[id], mine: m[id], want: w[id] })
    }
  }
  if (!extra.length && !missed.length) return null

  const code = mine.code.map((c) => c.toLowerCase())
  const nullText = mine.literals.some((lit) => lit.trim().toUpperCase() === 'NULL')
    ? `'NULL' in quotes is text made of four letters, not an empty cell. An empty cell is NULL with no quotes, or a column you leave out.`
    : ''
  if (unchanged(start, mineState)) {
    if (mine.leftOpen) {
      return 'Nothing changed in the end: your file starts a transaction with BEGIN and never ends it with COMMIT, so the database undid the change when the connection closed.'
    }
    if (mine.ran.includes('ROLLBACK')) return 'Nothing changed in the end: ROLLBACK undid your change, and this task keeps it.'
    if (!mine.ran.some((p) => WRITES.includes(p))) return 'Your file only reads: nothing in the database changed. This task asks for a change.'
    const date = code.some((c) => /\b\d{4}\s*-\s*\d{1,2}\s*-\s*\d{1,2}\b/.test(c))
      ? ' A date without quotes is a sum to SQLite: 2026-01-01 means 2026 minus 1 minus 1. Dates here are text, so they go in single quotes.'
      : ''
    return `Nothing in the database changed: your statement matched no row. Run its WHERE as a SELECT to see which rows it picks.${date}`
  }

  const parts = []
  const newRow = missed.find((r) => r.start === undefined && r.mine === undefined)
  const moved = newRow && extra.find((r) => r.kind === 'added' && r.table === newRow.table && key(r.row.slice(1)) === key(newRow.want.slice(1)))
  if (moved) {
    parts.push(`Your new row in ${newRow.table} has a different id from the one the database picks. An id typed by hand only fits the rows you can see: leave id out, and the database picks the next free one.`)
  } else if (extra.length) {
    const { table, kind } = extra[0]
    const n = extra.filter((r) => r.table === table && r.kind === kind).length
    const verb = { added: `added ${plural(n, 'row')} to`, removed: `removed ${plural(n, 'row')} of`, changed: `changed ${plural(n, 'other row')} of` }[kind]
    const example = seen && kind !== 'added' ? ` ${n === 1 ? 'It is' : 'One of them is'} the row with id ${extra[0].id}.` : ''
    parts.push(`Your file also ${verb} ${table} that the task leaves alone.${example}`)
    const wrongRow = missed.some((r) => r.mine !== undefined && sameRow(r.mine, r.start))
    parts.push(kind === 'added' ? 'This task adds one row.' : whereHint(mine.code, wrongRow))
  }
  const first = missed.find((r) => r !== newRow || !moved)
  if (first) {
    const n = missed.filter((r) => kindOf(r.start, r.want) === kindOf(first.start, first.want)).length
    const wrongCols = () => first.columns.filter((_, i) => key([first.mine[i]]) !== key([first.want[i]]))
    const yours = (cols) => (seen ? ` Yours has ${cols.map((c) => `${c} = ${show(first.mine[first.columns.indexOf(c)])}`).join(', ')}.` : '')
    const wantKind = kindOf(first.start, first.want)
    if (wantKind === 'added') {
      if (first.mine === undefined) parts.push(`No new row in ${first.table}${moved ? '' : ' where the task adds one'}.`)
      else {
        const cols = wrongCols()
        parts.push(`The new row in ${first.table} has the wrong ${cols.join(' and ')}.${yours(cols)}`)
        const values = (row) => cols.map((c) => key([row[first.columns.indexOf(c)]])).sort()
        if (cols.length > 1 && key(values(first.mine)) === key(values(first.want))) {
          parts.push('In an INSERT, the values go into the columns you list in the same order, one for one.')
        } else if (cols.some((c) => first.mine[first.columns.indexOf(c)] === '' && first.want[first.columns.indexOf(c)] === null)) {
          parts.push("'' is empty text, not an empty cell. An empty cell is NULL with no quotes, or a column you leave out.")
        } else if (!nullText) {
          parts.push('Compare each value with the task, letter for letter: capital letters and spaces count.')
        }
      }
    } else if (wantKind === 'changed') {
      if (first.mine === undefined) {
        parts.push('The row the task changes was removed. This task changes values in it with UPDATE; DELETE removes the whole row.')
      } else if (sameRow(first.mine, first.start)) {
        parts.push(`${n === 1 ? 'The row the task is about' : `${n} rows the task is about`} did not change. Look at your WHERE: does it pick ${n === 1 ? 'that row' : 'them'}?`)
      } else {
        const cols = wrongCols()
        parts.push(`The row the task changes has the wrong ${cols.join(' and ')}.${yours(cols)}`)
        if (code.some((c) => /\bset\b((?!\bwhere\b)[\s\S])*\band\b/.test(c))) {
          parts.push('In SET, a comma goes between two changes. AND joins them into one true-or-false test, so the first column gets 0 or 1 instead.')
        }
      }
    } else if (first.mine !== undefined && sameRow(first.mine, first.start)) {
      parts.push(`${n === 1 ? 'A row the task removes is' : `${n} rows the task removes are`} still there. Look at your WHERE.`)
    } else {
      parts.push('A row the task removes was changed instead. DELETE removes whole rows.')
    }
    if (nullText) parts.push(nullText)
  }
  return parts.join(' ')
}

/** Whether the statements that ran make the shape the task asks for: BEGIN, the change, a look, then the end. */
function transactionShape(ran, end) {
  const word = end[0]
  let open = false
  let wrote = false
  let looked = false
  let ended = false
  for (const p of ran) {
    if (p === 'BEGIN') open = true
    else if (WRITES.includes(p)) {
      if (!open) return `Every change in this task goes inside the transaction, after BEGIN and before ${word}.`
      wrote = true
      looked = false
    } else if (p === 'SELECT') looked ||= open && wrote
    else if (open) {
      if (wrote && !end.includes(p)) return `This task ends the transaction with ${word}, after the change.`
      if (wrote && !looked) return `Look at the result with a SELECT after the change and before ${word}.`
      ended ||= wrote
      open = false
    }
  }
  if (!wrote) return `This task makes a change inside a transaction, after BEGIN and before ${word}.`
  if (!ended) return `This task ends the transaction with ${word}, after the change.`
  return null
}

const HIDDEN_ROWS = 'On hidden data, which has more rows than seed.sql: '
const FITS_ONLY_ROWS =
  ' Your file works on the data you can see, so look for a WHERE that only happens to fit those rows, or a value typed by hand.'

/**
 * A task that changes rows, judged by the tables afterwards on both sets of data. `transaction` is
 * 'commit' when the change must be kept inside a transaction, or 'rollback' when it is tried inside
 * one and undone: then the state just before ROLLBACK is judged, and the data must end as it began.
 */
export async function checkChange(t, file, { transaction } = {}) {
  const files = [join(t.workspace, file), t.chapterPath(`solution/${file}`)]
  const seed = t.chapterPath('starter/seed.sql')
  const job = (seeds) => ({ schema: t.chapterPath('starter/schema.sql'), seeds, files, allowed: ROWS, snapshot: true })
  const [shown, hidden] = await Promise.all([[seed], [seed, HIDDEN_CHANGES]].map((seeds) => runChange(t, job(seeds))))
  if (!shown || !hidden) return [detail('The file finishes', TOO_LONG)]
  const [mine, want] = shown.results
  const stop = halt(mine, file, ROWS_ARE)
  if (stop) return stop

  const judge = ({ before, results: [m, w] }, seen) => {
    if (m.error !== undefined) return `SQLite could not run statement ${m.at} of your file: ${m.error}.${errorHint(m.error, m.line)}`
    if (transaction !== 'rollback') return compareRows(before.tables, m.final, w.final, m, seen)
    if (!m.tried) {
      if (m.ran.includes('COMMIT') || m.ran.includes('END')) return 'COMMIT kept the change. This task tries the change and then undoes it.'
      return 'Your file has no ROLLBACK, so nothing undoes the change. This task tries a change inside a transaction and then undoes it.'
    }
    const ran = m.ran.filter((p) => !['ROLLBACK', 'COMMIT', 'END'].includes(p))
    const inside = compareRows(before.tables, m.tried, w.tried, { ...m, leftOpen: false, ran }, seen)
    if (inside) return `Inside your transaction, before ROLLBACK: ${inside}`
    if (!unchanged(before.tables, m.final)) return 'After ROLLBACK the data is still not as it began: a change made before BEGIN or after ROLLBACK stays.'
    return null
  }
  const seen = judge(shown, true)
  const unseen = judge(hidden, false)
  const state = transaction === 'rollback' && !seen?.startsWith('After ROLLBACK') ? mine.tried : mine.final
  const details = [
    { name: 'The file runs', passed: true },
    detail(
      transaction === 'rollback' ? 'Tries the right change in the data you can see' : 'Changes the right rows, and no others, in the data you can see',
      seen,
      state && formatChanges(shown.before.tables, state)
    ),
    detail(
      transaction === 'rollback' ? 'Tries the right change in hidden data' : 'Changes the right rows, and no others, in hidden data',
      unseen && (seen ? 'Not yet: fix the change on the data you can see first.' : HIDDEN_ROWS + unseen + FITS_ONLY_ROWS)
    )
  ]
  if (transaction) {
    const shape = transactionShape(mine.ran, transaction === 'commit' ? ['COMMIT', 'END'] : ['ROLLBACK'])
    details.push(detail('Uses a transaction the way the task asks', shape))
  }
  return details
}

/** The type a declared column type stands for in this engine. */
function affinity(type) {
  const t = type.toUpperCase()
  if (t.includes('INT')) return 'INTEGER'
  if (/CHAR|CLOB|TEXT/.test(t)) return 'TEXT'
  if (t === '' || t.includes('BLOB')) return 'BLOB'
  if (/REAL|FLOA|DOUB/.test(t)) return 'REAL'
  return 'NUMERIC'
}

/**
 * A task that makes a table. Check runs only the file's CREATE TABLE statements, then looks at the
 * columns and tries rows of its own, each in a step that is undone after. `columns` maps each column
 * to the type it stands for. A probe is { name, run, read?, want?, refused?, message, refusedMessage? }:
 * `message` says what went wrong, and `refusedMessage` what to say when a row it expects in is refused.
 */
export async function checkTable(t, file, { table, columns, probes }) {
  const job = {
    schema: t.chapterPath('starter/schema.sql'),
    seeds: [t.chapterPath('starter/seed.sql')],
    files: [join(t.workspace, file)],
    allowed: TABLES,
    only: ['CREATE TABLE'],
    table,
    probes: probes.map(({ run, read }) => ({ run, read }))
  }
  const r = await runChange(t, job)
  if (!r) return [detail('The file finishes', TOO_LONG)]
  const [mine] = r.results
  const stop = halt(mine, file, TABLES_ARE)
  if (stop) return stop
  if (!mine.ran.length) return [detail('The file makes a table', `${file} has no CREATE TABLE yet. Write it above the rows that try it.`)]
  if (!mine.columns.length) return [detail('The file makes the table', `Your file makes a table, but none called ${table}. The task gives the name.`)]

  const have = new Map(mine.columns.map(([name, type]) => [name.toLowerCase(), type]))
  const missing = Object.keys(columns).filter((c) => !have.has(c))
  const extra = mine.columns.map(([name]) => name).filter((c) => !(c.toLowerCase() in columns))
  if (missing.length || extra.length) {
    const message = [
      missing.length ? `Missing ${missing.length === 1 ? 'column' : 'columns'}: ${missing.join(', ')}.` : '',
      extra.length ? `${extra.length === 1 ? 'A column' : 'Columns'} the task does not list: ${extra.join(', ')}.` : '',
      'Look at the names in your CREATE TABLE, and at the comma between each two columns.'
    ]
    return [{ name: 'The table is made', passed: true }, detail('Has the columns the task lists', message.filter(Boolean).join(' '))]
  }
  const wrongType = Object.entries(columns).find(([c, type]) => affinity(have.get(c)) !== type)
  const typeMessage = wrongType
    ? `The column ${wrongType[0]} is declared ${have.get(wrongType[0]) ? have.get(wrongType[0]) : 'with no type'}, so this engine treats its values as ${affinity(have.get(wrongType[0]))}. The task asks for ${wrongType[1]}.`
    : null
  return [
    { name: 'The table is made', passed: true },
    detail('Has the columns the task lists, with their types', typeMessage),
    ...probes.map((p, i) => {
      const got = mine.probes[i]
      let message = null
      if (p.refused) message = got.ok ? p.message : null
      else if (!got.ok) message = `${p.refusedMessage ?? p.message} SQLite said: ${got.error}.${errorHint(got.error)}`
      else if (p.want && key(got.rows.flat()) !== key(p.want)) message = p.message
      return detail(p.name, message)
    })
  ]
}

const describePlan = (plan) => plan.join(', then ')
const usedIndex = (line) => line.match(/\bUSING (?:COVERING )?INDEX (\S+)/)?.[1]

/**
 * A task that makes or removes indexes. Check runs only the file's CREATE INDEX and DROP INDEX
 * statements. With `plans`, it asks SQLite for the plan of each of its own queries ({ sql, about,
 * search? }) and wants an index the file made in it, searching on `search` when given. With `keep`,
 * the indexes afterwards must be exactly those.
 */
export async function checkIndex(t, file, { plans, keep }) {
  const job = {
    schema: t.chapterPath('starter/schema.sql'),
    seeds: [t.chapterPath('starter/seed.sql')],
    files: [join(t.workspace, file)],
    allowed: INDEXES,
    only: ['CREATE INDEX', 'CREATE UNIQUE INDEX', 'DROP INDEX'],
    plans: plans?.map((p) => p.sql)
  }
  const r = await runChange(t, job)
  if (!r) return [detail('The file finishes', TOO_LONG)]
  const [mine] = r.results
  const stop = halt(mine, file, INDEXES_ARE)
  if (stop) return stop
  const startNames = r.before.indexes.map((i) => i.name)
  const made = mine.indexes.filter((i) => !startNames.includes(i.name))
  const names = mine.indexes.map((i) => i.name)

  if (keep) {
    if (!mine.ran.includes('DROP INDEX')) return [detail('The file removes an index', `${file} has no DROP INDEX yet.`)]
    const lost = startNames.filter((n) => keep.includes(n) && !names.includes(n))
    let message = null
    if (made.length) message = 'Your file makes a new index. This task only removes the one nobody uses.'
    else if (lost.length) {
      message = `You removed ${lost.join(' and ')}, and one of the practice's queries uses ${lost.length === 1 ? 'it' : 'them'}: without it, that query reads every row again. Read the plan of each query in practice-queries.sql.`
    } else if (names.length > keep.length) {
      message = 'Every index the practice started with is still there. Read the plan of each query in practice-queries.sql, and look for the index that no plan names.'
    }
    return [{ name: 'The file runs', passed: true }, detail('Removes the index no query uses, and only that one', message)]
  }

  if (!made.length) {
    return [detail('The file makes an index', mine.ran.length ? 'Your file makes no new index: the one it removes or makes is gone again by the end.' : `${file} has no CREATE INDEX yet.`)]
  }
  const sameAs = (a) => mine.indexes.find((b) => b !== a && a.table === b.table && key(a.columns) === key(b.columns))
  const twin = made.find(sameAs)
  const details = [{ name: 'The file runs', passed: true }]
  if (twin) {
    const other = sameAs(twin)
    const what = made.includes(other)
      ? `two indexes on the same columns of ${twin.table}: ${twin.name} and ${other.name}`
      : `${twin.name} on the same columns of ${twin.table} as ${other.name}, which schema.sql has already`
    details.push(
      detail('Makes each index once', `Your file makes ${what}. Every index is kept up to date on each change to the table, so one is enough.`)
    )
  }
  const dropped = startNames.filter((n) => !names.includes(n))
  if (dropped.length) {
    details.push(
      detail('Leaves the practice\'s indexes in place', `Your file removes ${dropped.join(' and ')}, which this task does not ask for. Every index of schema.sql stays.`)
    )
  }
  const mineNames = made.map((i) => i.name)
  for (const [i, p] of plans.entries()) {
    const plan = mine.plans[i]
    const line = plan.find((l) => /^SEARCH /.test(l) && mineNames.includes(usedIndex(l)))
    const asked = `Check asked SQLite for the plan of ${p.about}, and it says: `
    let message = null
    if (!line) {
      const scan = plan.some((l) => /^SCAN /.test(l))
      const covering = plan.some((l) => /^SCAN /.test(l) && mineNames.includes(usedIndex(l)))
        ? ' A SCAN that names your index still reads every entry of it, because the index is not in the order this search needs.'
        : ''
      message = `${asked}${describePlan(plan)}.${scan ? ` SCAN means it reads every row of that table, so no index of yours helps this search.${covering} Look at which column the search looks up, and which table your index is on.` : ' No index of yours is in it.'}`
    } else if (p.search && !line.includes(`(${p.search})`)) {
      const used = made.find((m) => m.name === usedIndex(line))
      message = `${asked}${line}. Your index helps with only part of the search. ${
        used.columns.length === 1
          ? 'SQLite uses one index for each table in a search, so one index has to hold both columns.'
          : "An index on two columns helps with both only when they come in the order the lesson's part on two columns gives."
      }`
    }
    details.push(detail(`SQLite uses your index for ${p.about}`, message))
  }
  return details
}
