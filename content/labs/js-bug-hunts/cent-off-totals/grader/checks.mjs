import { isDeepStrictEqual } from 'node:util'
import { receipt as buggy } from '../starter/src/receipt.js'
import { receipt as rightReceipt } from '../solution/src/receipt.js'
import { groupOrder, lockerOrder, ticketOrder } from '../starter/src/orders.js'

const show = (r) => (r.ok ? JSON.stringify(r.value, null, 2) : r.error)
const clear = (details) => details.map((d) => (d.passed ? { ...d, message: undefined } : d))

const cases = [
  { name: 'The ticket order is right to the cent', order: ticketOrder },
  { name: 'An order without a discount is right', order: lockerOrder },
  { name: 'The group order is right to the cent', order: groupOrder },
  {
    name: 'A 30% discount on a half cent is right',
    order: { lines: [{ price: 18.15, qty: 1 }, { price: 4.1, qty: 1 }], discountPercent: 30 }
  },
  { name: 'An empty order is all zeros', order: { lines: [], discountPercent: 10 } },
  {
    name: 'A full discount leaves nothing to pay',
    order: { lines: [{ price: 24.5, qty: 2 }, { price: 0.15, qty: 1 }], discountPercent: 100 }
  }
]

export const checks = {
  async reproduce(t) {
    const dir = await t.sandbox({ 'src/receipt.js': t.chapterPath('starter/src/receipt.js') })
    const r = await t.call(dir, 'src/reproduce.js', 'reproduceCentDrift')
    if (!r.ok) {
      return [
        {
          name: 'reproduceCentDrift returns a result',
          passed: false,
          message: 'reproduceCentDrift threw instead of returning { lines, discountPercent, shown, correct }. Read the error.',
          output: r.error
        }
      ]
    }
    const { lines, discountPercent, shown, correct } = r.value ?? {}
    const usable = Array.isArray(lines) && typeof discountPercent === 'number'
    const real = usable ? buggy(lines, discountPercent) : undefined
    const right = usable ? rightReceipt(lines, discountPercent) : undefined
    return clear([
      {
        name: 'Returns the order it used',
        passed: usable,
        message: 'Return the lines array and the discountPercent you passed to receipt().',
        output: show(r)
      },
      {
        name: 'shown is what the original receipt() printed',
        passed: usable && isDeepStrictEqual(shown, real),
        message: 'shown should be exactly the object receipt(lines, discountPercent) returned, unchanged.',
        output: `${show(r)}\n\nreceipt() returned:\n${JSON.stringify(real, null, 2)}`
      },
      {
        name: 'correct is the receipt worked out by hand',
        passed: usable && isDeepStrictEqual(correct, right),
        message: 'correct does not match the receipt for this order. Work it out in whole cents: round the discount to the nearest cent, half a cent rounds up, and subtract.',
        output: show(r)
      },
      {
        name: 'The order shows the bug',
        passed: usable && !isDeepStrictEqual(real, right),
        message: 'receipt() gets this order right, so it does not show the bug. Try an order with a discount, such as the one from the ticket.',
        output: show(r)
      }
    ])
  },

  async fix(t) {
    const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
    const calls = cases.map((c) =>
      t.call(dir, 'src/receipt.js', 'receipt', [c.order.lines, c.order.discountPercent])
    )
    const [grid, ...results] = await Promise.all([t.call(dir, '.grader/drive.mjs', 'grid'), ...calls])
    const details = cases.map((c, i) => {
      const r = results[i]
      const expected = rightReceipt(c.order.lines, c.order.discountPercent)
      return {
        name: c.name,
        passed: r.ok && isDeepStrictEqual(r.value, expected),
        message: r.ok
          ? 'One of subtotal, discount or total is off. Check the rounding rule in the task and whether the total is built from the rounded discount.'
          : 'receipt() threw for this order.',
        output: `receipt(${JSON.stringify(c.order.lines)}, ${c.order.discountPercent})\ngot ${show(r)}`
      }
    })
    const { orders = [], receipts = [] } = grid.ok ? grid.value : {}
    const misses = orders.filter(
      (o, i) => !isDeepStrictEqual(receipts[i], rightReceipt(o.lines, o.discountPercent))
    )
    const first = misses[0]
    details.push({
      name: 'Hundreds more orders are right to the cent',
      passed: grid.ok && misses.length === 0,
      message: grid.ok
        ? `${misses.length} of ${orders.length} orders came out wrong. Adding dollars as floating point numbers is never exact. Think about which unit has no fractions.`
        : 'receipt() threw while the check ran it on many orders.',
      output: grid.ok
        ? first &&
          `First wrong one: receipt(${JSON.stringify(first.lines)}, ${first.discountPercent}) gave ${JSON.stringify(receipts[orders.indexOf(first)])}`
        : grid.error
    })
    return clear(details)
  },

  test(t) {
    return t.judgeTest({
      test: 'src/receipt.test.js',
      target: 'src/receipt.js',
      wrong: 'grader/variants/round-each-value.js',
      wrongLabel: 'a fix that rounds each value at the end'
    })
  }
}
