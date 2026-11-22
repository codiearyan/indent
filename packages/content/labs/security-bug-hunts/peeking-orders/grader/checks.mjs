import { isDeepStrictEqual } from 'node:util'
import { orders } from '../starter/src/seed.js'

const show = (value) => JSON.stringify(value, null, 2)
const clear = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))
const ownerOf = (id) => orders.find((o) => o.id === Number(id))?.customerId
const page = (id) => {
  const { title, status, note, shipTo, total } = orders.find((o) => o.id === Number(id))
  return { id: Number(id), title, status, note, shipTo, total }
}

const starterFiles = (t) => ({
  'src/db.js': t.chapterPath('starter/src/db.js'),
  'src/seed.js': t.chapterPath('starter/src/seed.js'),
  '.grader/drive.mjs': t.chapterPath('grader/drive.mjs')
})

const own = [
  { name: 'A customer opens their own order', customerId: 101, orderId: 2041 },
  { name: 'Another customer opens their own order', customerId: 102, orderId: 2045 },
  { name: 'An order number from a link, as text, still opens', customerId: 103, orderId: '2044' }
]
const others = [
  { customerId: 101, orderId: 2042 },
  { customerId: 102, orderId: 2041 },
  { customerId: 103, orderId: 2043 },
  { customerId: 101, orderId: '2046' }
]
const MISSING = { customerId: 101, orderId: 9999 }

export const checks = {
  async reproduce(t) {
    const dir = await t.sandbox({ ...starterFiles(t), 'src/orders.js': t.chapterPath('starter/src/orders.js') })
    const r = await t.call(dir, 'src/reproduce.js', 'reproduceOrderPeek')
    if (!r.ok) {
      return [
        {
          name: 'reproduceOrderPeek returns a result',
          passed: false,
          message: 'reproduceOrderPeek threw instead of returning { session, orderId, shown }. Read the error.',
          output: r.error
        }
      ]
    }
    const { session, orderId, shown } = r.value ?? {}
    const customerId = session?.customerId
    const usable = orders.some((o) => o.customerId === customerId) && orderId !== undefined
    const run = usable ? await t.call(dir, '.grader/drive.mjs', 'open', [[[session, orderId]]]) : undefined
    const real = run?.ok ? run.value[0] : undefined
    return clear([
      {
        name: 'Returns the session and the order number it used',
        passed: usable,
        message: 'Return session as { customerId } with a customer id from seed.js, and the orderId you asked for.',
        output: show(r.value)
      },
      {
        name: 'shown is what the original getOrder() returned',
        passed: usable && real?.order !== undefined && isDeepStrictEqual(shown, real.order),
        message: 'shown should be exactly what getOrder(db, session, orderId) returned, unchanged.',
        output: `${show(r.value)}\n\ngetOrder() returned:\n${real?.error ?? show(real?.order)}`
      },
      {
        name: 'shown is an order that belongs to someone else',
        passed: usable && shown !== null && ownerOf(orderId) !== undefined && ownerOf(orderId) !== customerId,
        message:
          ownerOf(orderId) === undefined
            ? 'There is no order with this number, so nothing was shown. Pick an order from seed.js.'
            : 'This order belongs to the signed-in customer, so it does not show the hole. Ask for one of another customer\'s orders.',
        output: `${show(r.value)}\n\nOrder ${orderId} belongs to customer ${ownerOf(orderId) ?? 'nobody'}`
      }
    ])
  },

  async fix(t) {
    const dir = await t.sandbox(starterFiles(t))
    const all = [...own, ...others, MISSING]
    const run = await t.call(dir, '.grader/drive.mjs', 'open', [
      all.map((c) => [{ customerId: c.customerId }, c.orderId])
    ])
    if (!run.ok) {
      return [
        {
          name: 'orders.js loads',
          passed: false,
          message: 'orders.js could not be loaded. Read the error.',
          output: run.error
        }
      ]
    }
    const call = (c) => `getOrder(db, { customerId: ${c.customerId} }, ${JSON.stringify(c.orderId)})`
    const got = (r) => r.error ?? show(r.order)
    const details = own.map((c, i) => {
      const r = run.value[i]
      return {
        name: c.name,
        passed: !r.error && isDeepStrictEqual(r.order, page(c.orderId)),
        message: r.error
          ? 'getOrder threw for the customer\'s own order.'
          : typeof c.orderId === 'string'
            ? 'The customer did not get their own order. A number from a link arrives as text, and their own orders must still open.'
            : 'The customer did not get their own order in full. Their own orders must still open.',
        output: `${call(c)}\ngot ${got(r)}`
      }
    })
    others.forEach((c, j) => {
      const r = run.value[own.length + j]
      details.push({
        name: `Customer ${c.customerId} cannot open order ${c.orderId}, which is not theirs`,
        passed: !r.error && r.order === null,
        message: r.error
          ? 'getOrder threw for an order that is not theirs. An order that does not exist gives null, so this answer tells the customer the number is a real order.'
          : r.order === null
            ? undefined
            : 'Changing the number in the link opened another customer\'s order. Who may see an order is decided by the signed-in customer, not by the number they ask for.',
        output: `${call(c)}\ngot ${got(r)}\n\nOrder ${c.orderId} belongs to customer ${ownerOf(c.orderId)}`
      })
    })
    const missing = run.value.at(-1)
    details.push({
      name: 'An order that does not exist gives null',
      passed: !missing.error && missing.order === null,
      message: 'getOrder should give null when there is no order with this number.',
      output: `${call(MISSING)}\ngot ${got(missing)}`
    })
    return clear(details)
  },

  test(t) {
    return t.judgeTest({
      test: 'src/orders.test.js',
      target: 'src/orders.js',
      wrong: 'grader/variants/tell-the-owner.js',
      wrongLabel: 'a fix that refuses with an error saying the order is someone else\'s'
    })
  }
}
