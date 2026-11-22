import { isDeepStrictEqual } from 'node:util'
import { orders } from '../starter/src/seed.js'

const show = (value) => JSON.stringify(value, null, 2)
const clear = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))
const ownIds = (customerId) => orders.filter((o) => o.customerId === customerId).map((o) => o.id)
const rowsFor = (ids) =>
  ids.map((id) => {
    const { title, status } = orders.find((o) => o.id === id)
    return { id, title, status }
  })

const starterFiles = (t) => ({
  'src/db.js': t.chapterPath('starter/src/db.js'),
  'src/seed.js': t.chapterPath('starter/src/seed.js'),
  '.grader/drive.mjs': t.chapterPath('grader/drive.mjs')
})

// `word` is a piece of the text that would show up in the SQL if the text were written into it.
const honest = [
  { name: 'A plain word finds the customer\'s own orders', customerId: 101, text: 'cards', word: 'cards', ids: [2043] },
  { name: 'Case does not matter', customerId: 101, text: 'WEDDING', word: 'WEDDING', ids: [2041] },
  { name: 'An apostrophe is searched like any letter', customerId: 103, text: "Mother's Day", word: 'Mother', ids: [2044] },
  { name: 'An empty search lists all the customer\'s orders', customerId: 102, text: '', ids: [2042, 2045] }
]
const hostile = [
  { customerId: 101, text: "' OR 1=1 --", word: '1=1' },
  { customerId: 102, text: "%' OR title LIKE '%", word: 'OR title LIKE' },
  { customerId: 103, text: "' OR customer_id = 101 --", word: 'customer_id = 101' },
  { customerId: 101, text: "' UNION SELECT id, email, password_hash FROM customers --", word: 'UNION' }
]

export const checks = {
  async reproduce(t) {
    const dir = await t.sandbox({
      ...starterFiles(t),
      'src/search.js': t.chapterPath('starter/src/search.js')
    })
    const r = await t.call(dir, 'src/reproduce.js', 'reproduceSearchLeak')
    if (!r.ok) {
      return [
        {
          name: 'reproduceSearchLeak returns a result',
          passed: false,
          message:
            'reproduceSearchLeak threw instead of returning { customerId, text, shown }. Read the error: if the search itself threw, the text broke the query instead of changing it.',
          output: r.error
        }
      ]
    }
    const { customerId, text, shown } = r.value ?? {}
    const usable = ownIds(customerId).length > 0 && typeof text === 'string'
    const run = usable ? await t.call(dir, '.grader/drive.mjs', 'search', [[[customerId, text]]]) : undefined
    const real = run?.ok ? run.value[0] : undefined
    const leaked = Array.isArray(real?.rows) && real.rows.some((row) => !ownIds(customerId).includes(row?.id))
    return clear([
      {
        name: 'Returns the customer and the text it used',
        passed: usable,
        message: 'Return customerId, one of the customer ids in seed.js, and the text you searched for, as a string.',
        output: show(r.value)
      },
      {
        name: 'shown is what the original searchOrders() returned',
        passed: usable && real?.rows !== undefined && isDeepStrictEqual(shown, real.rows),
        message: 'shown should be exactly the list searchOrders(db, customerId, text) returned, unchanged.',
        output: `${show(r.value)}\n\nsearchOrders() returned:\n${real?.error ?? show(real?.rows)}`
      },
      {
        name: 'shown holds an order that is not the customer\'s',
        passed: usable && leaked,
        message:
          'Every row here belongs to this customer, so it does not show the hole. The text has to end the quoted part of the query and add a condition of its own.',
        output: `${show(r.value)}\n\nThe customer's own orders: ${ownIds(customerId).join(', ') || 'none'}`
      }
    ])
  },

  async fix(t) {
    const dir = await t.sandbox(starterFiles(t))
    const all = [...honest, ...hostile]
    const run = await t.call(dir, '.grader/drive.mjs', 'search', [all.map((c) => [c.customerId, c.text])])
    if (!run.ok) {
      return [
        {
          name: 'search.js loads',
          passed: false,
          message: 'search.js could not be loaded. Read the error.',
          output: run.error
        }
      ]
    }
    const results = run.value
    const call = (c) => `searchOrders(db, ${c.customerId}, ${JSON.stringify(c.text)})`
    const got = (r) => (r.error ? r.error : show(r.rows))
    const details = honest.map((c, i) => {
      const r = results[i]
      return {
        name: c.name,
        passed: !r.error && isDeepStrictEqual(r.rows, rowsFor(c.ids)),
        message: r.error
          ? 'The search threw on honest text. While the text is part of the query, a quote in it breaks the query.'
          : 'This honest search did not find the customer\'s orders whose title holds the text. If the text is cleaned or changed first, it no longer matches what the customer typed.',
        output: `${call(c)}\ngot ${got(r)}`
      }
    })
    hostile.forEach((c, j) => {
      const r = results[honest.length + j]
      const leaked = Array.isArray(r.rows) && r.rows.some((row) => !ownIds(c.customerId).includes(row?.id))
      details.push({
        name: `Text that looks like SQL is only searched for: ${c.text}`,
        passed: !r.error && isDeepStrictEqual(r.rows, []),
        message: r.error
          ? 'The search threw on this text. It should look for it in the titles like any other words, and find nothing.'
          : leaked
            ? 'This text changed the query, and the customer got rows that are not their own orders.'
            : 'No title holds this text, so the search should find nothing.',
        output: `${call(c)}\ngot ${got(r)}`
      })
    })
    const inSql = all
      .map((c, i) => ({ c, sql: results[i].sql.find((s) => c.word && s.includes(c.word)) }))
      .find((x) => x.sql)
    details.push({
      name: 'The search text never becomes part of the SQL',
      passed: !inSql,
      message:
        'The customer\'s text was written into the SQL the database reads. While it is part of the query, some text can still change what the query does, however it was cleaned first.',
      output: inSql ? `${call(inSql.c)} handed the database:\n${inSql.sql}` : undefined
    })
    const idInSql = all
      .map((c, i) => ({ c, sql: results[i].sql.find((s) => s.includes(String(c.customerId))) }))
      .find((x) => x.sql)
    details.push({
      name: 'The customer id never becomes part of the SQL',
      passed: !idInSql,
      message:
        'The customer id was written into the SQL text. It is a value too, and values travel to the database apart from the query.',
      output: idInSql ? `${call(idInSql.c)} handed the database:\n${idInSql.sql}` : undefined
    })
    return clear(details)
  },

  test(t) {
    return t.judgeTest({
      test: 'src/search.test.js',
      target: 'src/search.js',
      wrong: 'grader/variants/strip-quotes.js',
      wrongLabel: 'a fix that strips quotes from the text'
    })
  }
}
