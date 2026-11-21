import { isDeepStrictEqual } from 'node:util'

const item = (sku, qty, priceCents) => ({ sku, qty, priceCents })
const order = (status, placedAt, items, discountCents) => ({
  id: 'T',
  status,
  placedAt,
  items,
  ...(discountCents === undefined ? {} : { discountCents })
})

const FILE = 'src/reports.js'

// Runs every case in its own call. A file that does not load, or a function that still throws
// 'Not implemented', gets one detail instead of one confusing failure per case.
async function runCases(t, dir, fn, cases) {
  const runs = await Promise.all(cases.map((c) => t.call(dir, FILE, fn, c.args)))
  const broken = runs.find((r) => !r.ok && /^SyntaxError/.test(r.error))
  if (broken) {
    return [
      {
        name: `${FILE} runs`,
        passed: false,
        message: `${FILE} does not run, so no task in it can be checked. Fix the error below first.`,
        output: broken.error
      }
    ]
  }
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
    return runCases(t, dir, 'orderTotal', [
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
    return runCases(t, dir, 'topCandles', [
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
    const dir = await t.sandbox()
    const details = await runCases(t, dir, 'revenueByDay', [
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
    // Task 3 may build on orderTotal, which now lives in the same file, so a wrong Task 1 can
    // look like a wrong Task 3. Say so instead of leaving the learner to guess.
    if (details.length === 1 || details.every((d) => d.passed)) return details
    const probe = order('paid', day2, [item('sage', 2, 1800)], 600)
    const total = await t.call(dir, FILE, 'orderTotal', [probe])
    if (total.ok && total.value === 3000) return details
    return [
      {
        name: 'orderTotal from Task 1 gives the right totals',
        passed: false,
        message:
          'If revenueByDay uses orderTotal, it can only be as right as Task 1. Get Task 1 passing, then check again.',
        output: `orderTotal(${JSON.stringify(probe)})\n${total.ok ? `returned ${JSON.stringify(total.value)}` : total.error}`
      },
      ...details
    ]
  }
}
