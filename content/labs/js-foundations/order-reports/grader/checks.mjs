import { isDeepStrictEqual } from 'node:util'

const item = (sku, qty, priceCents) => ({ sku, qty, priceCents })
const order = (status, placedAt, items, discountCents) => ({
  id: 'T',
  status,
  placedAt,
  items,
  ...(discountCents === undefined ? {} : { discountCents })
})

// Runs every case in its own call; a function that still throws 'Not implemented' gets one detail.
async function runCases(t, dir, file, fn, cases) {
  const runs = await Promise.all(cases.map((c) => t.call(dir, file, fn, c.args)))
  const unwritten = runs.find((r) => !r.ok && /Not implemented/.test(r.error))
  if (unwritten) {
    return [
      {
        name: `${fn} is implemented`,
        passed: false,
        message: `${fn} still throws 'Not implemented'. Replace that line with your code.`,
        output: unwritten.error
      }
    ]
  }
  return cases.map((c, i) => {
    const r = runs[i]
    const passed = r.ok && isDeepStrictEqual(r.value, c.expected)
    return {
      name: c.name,
      passed,
      message: passed ? undefined : r.ok ? c.hint : `${fn} threw an error for this input. ${c.hint}`,
      output: `${fn}(${c.args.map((a) => JSON.stringify(a)).join(', ')})\n${r.ok ? `returned ${JSON.stringify(r.value)}` : r.error}`
    }
  })
}

const day1 = '2026-11-02T08:00:00Z'
const day2 = '2026-11-03T23:59:00Z'

export const checks = {
  async total(t) {
    const dir = await t.sandbox()
    return runCases(t, dir, 'src/orderTotal.js', 'orderTotal', [
      {
        name: 'Adds up several items',
        args: [order('paid', day1, [item('cedar', 2, 1250), item('lavender', 3, 1100)])],
        expected: 5800,
        hint: 'Each item is worth qty times priceCents. Check you multiply before adding.'
      },
      {
        name: 'An order with no items totals 0',
        args: [order('paid', day1, [])],
        expected: 0,
        hint: 'Look at the starting value of your sum for an empty items array.'
      },
      {
        name: 'Subtracts a discount',
        args: [order('paid', day1, [item('sage', 1, 1800)], 500)],
        expected: 1300,
        hint: 'Some orders have discountCents. The total should take it off.'
      },
      {
        name: 'Works when there is no discount field',
        args: [order('paid', day1, [item('sage', 2, 1800)])],
        expected: 3600,
        hint: 'When discountCents is missing the result should still be a number. Look for NaN.'
      },
      {
        name: 'Never goes below 0',
        args: [order('paid', day1, [item('amber', 1, 900)], 2000)],
        expected: 0,
        hint: 'A discount bigger than the order should not make the total negative.'
      },
      {
        name: 'Counts an item with qty 0 as nothing',
        args: [order('paid', day1, [item('amber', 0, 900), item('cedar', 1, 1250)])],
        expected: 1250,
        hint: 'An item with qty 0 adds nothing to the total.'
      }
    ])
  },

  async top(t) {
    const dir = await t.sandbox()
    const week = [
      order('paid', day1, [item('cedar', 2, 1250), item('amber', 4, 900)]),
      order('cancelled', day1, [item('sage', 10, 1800)]),
      order('pending', day2, [item('cedar', 3, 1250), item('lavender', 1, 1100)]),
      order('paid', day2, [item('amber', 1, 900), item('sage', 2, 1800)])
    ]
    return runCases(t, dir, 'src/topCandles.js', 'topCandles', [
      {
        name: 'Ranks the top two',
        args: [week, 2],
        expected: [
          { sku: 'amber', units: 5 },
          { sku: 'cedar', units: 5 }
        ],
        hint: 'Units of the same sku from different orders add up. Check the order and the tie rule.'
      },
      {
        name: 'Skips cancelled orders',
        args: [week, 3],
        expected: [
          { sku: 'amber', units: 5 },
          { sku: 'cedar', units: 5 },
          { sku: 'sage', units: 2 }
        ],
        hint: 'A cancelled order sold nothing. Look at how you filter by status.'
      },
      {
        name: 'Breaks ties alphabetically',
        args: [
          [order('paid', day1, [item('vanilla', 2, 1000), item('birch', 2, 1000), item('jasmine', 2, 1000)])],
          3
        ],
        expected: [
          { sku: 'birch', units: 2 },
          { sku: 'jasmine', units: 2 },
          { sku: 'vanilla', units: 2 }
        ],
        hint: 'When units are equal, the sku that comes first alphabetically goes first.'
      },
      {
        name: 'Returns everything when n is larger',
        args: [[order('paid', day1, [item('cedar', 1, 1250)])], 5],
        expected: [{ sku: 'cedar', units: 1 }],
        hint: 'If fewer skus were sold than n, return all of them and nothing extra.'
      },
      {
        name: 'Returns an empty array for no orders',
        args: [[], 3],
        expected: [],
        hint: 'With no orders there is nothing to rank.'
      }
    ])
  },

  async revenue(t) {
    const dir = await t.sandbox({ 'src/orderTotal.js': t.chapterPath('solution/src/orderTotal.js') })
    return runCases(t, dir, 'src/revenueByDay.js', 'revenueByDay', [
      {
        name: 'Groups paid orders by day',
        args: [
          [
            order('paid', day1, [item('cedar', 2, 1250)]),
            order('paid', '2026-11-02T21:30:00Z', [item('amber', 1, 900)]),
            order('paid', day2, [item('sage', 1, 1800)])
          ]
        ],
        expected: { '2026-11-02': 3400, '2026-11-03': 1800 },
        hint: 'Orders on the same date add up under one key. Check how you cut the date out of placedAt.'
      },
      {
        name: 'Only counts paid orders',
        args: [
          [
            order('paid', day1, [item('cedar', 1, 1250)]),
            order('pending', day1, [item('cedar', 4, 1250)]),
            order('cancelled', day2, [item('sage', 1, 1800)])
          ]
        ],
        expected: { '2026-11-02': 1250 },
        hint: 'Pending and cancelled orders are not revenue, and a day with only those should not appear.'
      },
      {
        name: 'Includes discounts',
        args: [[order('paid', day2, [item('sage', 2, 1800)], 600)]],
        expected: { '2026-11-03': 3000 },
        hint: 'Revenue is what the customer paid, so discounts count.'
      },
      {
        name: 'Returns an empty object for no orders',
        args: [[]],
        expected: {},
        hint: 'With no orders the result is an object with no keys.'
      }
    ])
  }
}
