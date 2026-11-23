import { block, judge } from '../../grading.mjs'

const test = 'src/bill.test.js'
const target = 'src/bill.js'

const BOXES = 'order.boxes.reduce('
const EGGS = '+ eggPrice(order.dozens ?? 0)'
const SMALL = 'if (dozens <= 2) return dozens * 3'
const MIDDLE = 'if (dozens <= 5) return dozens * 2.5'
const CAFE = 'return dozens * 2\n'

const extra = (what) => (name) =>
  `"${name}" also fails on a version where only ${what} is wrong. The bug in Nell's report has nothing to do with that, so your test still carries a detail the bug does not need. Take it out, run the test, and check it still fails on the code in your workspace.`

export const checks = {
  report: (t) =>
    judge(t, {
      test,
      target,
      ...block('bill'),
      limit: 2000,
      none: 'The bill in your test comes out right even with the bug, so it cannot show it.',
      wrong: [
        {
          label: 'is the code Nell was charged by',
          change: [BOXES, '[...new Set(order.boxes)].reduce('],
          hint: 'Your test must fail on the code in your workspace, as Nell\'s bill did. Run it, and if it passes, put back details from the report until it fails.'
        },
        {
          label: 'has a smaller slip of the same kind',
          change: [BOXES, 'order.boxes.filter((size, i) => size !== order.boxes[i - 1]).reduce('],
          hint: 'Keep only the boxes the bug needs, and put them next to each other in the list.'
        }
      ],
      same: [
        {
          label: 'charges double for eggs, and has no other bug',
          change: [EGGS, `${EGGS} * 2`],
          message: extra('the egg price')
        },
        {
          label: 'takes a fifth off for HARVEST, and has no other bug',
          change: ['boxes / 10', 'boxes / 5'],
          message: extra('the HARVEST code')
        }
      ]
    }),

  async fix(t) {
    const dir = await t.sandbox()
    const cases = [
      { order: { customer: 'Ada Lin', boxes: ['small', 'small'] }, about: 'two boxes of the same size' },
      {
        order: { customer: 'Huw Penna', boxes: ['large', 'small', 'large', 'small'], dozens: 1 },
        about: 'two pairs of boxes, mixed up, with eggs'
      },
      {
        order: { customer: 'Nell Hollis', boxes: ['medium', 'large', 'large'], dozens: 2, code: 'HARVEST' },
        about: "Nell's order from the report"
      },
      {
        order: { customer: 'Cora Pellow', boxes: ['medium', 'small'], dozens: 4, code: 'HARVEST' },
        about: 'one box of each size, with eggs and HARVEST',
        same: true
      }
    ]
    const expected = [28, 79, 66.3, 39.7]
    const results = await Promise.all(cases.map((c) => t.call(dir, target, 'bill', [c.order])))
    const broken = results.find((r) => !r.ok)
    if (broken) {
      return [
        {
          name: 'bill runs',
          passed: false,
          message: 'bill stops with an error. Run your tests in the terminal and read the error and the line it points at.',
          output: broken.error
        }
      ]
    }
    const right = cases.map(
      (_, i) => typeof results[i].value === 'number' && Math.abs(results[i].value - expected[i]) < 0.005
    )
    const boxesRight = right[0] && right[1]
    return cases.map((c, i) => {
      const passed = right[i]
      return {
        name: `Charges right for ${c.about}`,
        passed,
        message: passed
          ? undefined
          : c.same
            ? `The bill for ${c.about} has changed, and it was right before. Change only what the bug in the report needs.`
            : boxesRight
              ? `The bill for ${c.about} is wrong, though boxes of the same size are paid for now. Something else changed: change only how the boxes are added up.`
              : `The bill for ${c.about} is still not what the price list says. Every box in the order is paid for, even when two are the same size: your test from the first task shows it.`,
        output: `bill(${JSON.stringify(c.order)}) gave ${JSON.stringify(results[i].value)}`
      }
    })
  },

  bands: (t) =>
    judge(t, {
      test,
      target,
      ...block('eggPrice'),
      limit: 2000,
      distinct: true,
      none: 'None of them fail on any wrong version. Tests that all use the same few numbers of dozens prove the same thing again and again.',
      wrong: [
        {
          label: 'charges 3.50 a dozen for small orders',
          change: [SMALL, SMALL.replace('* 3', '* 3.5')],
          hint: 'Test a number of dozens from the small orders, up to 2, with the price worked out by hand.'
        },
        {
          label: 'charges for a dozen when no eggs are ordered',
          change: [SMALL, SMALL.replace('dozens * 3', 'Math.max(dozens, 1) * 3')],
          hint: 'Test an order with no eggs at all.'
        },
        {
          label: 'charges 3 to 5 dozen at the small order price',
          change: [MIDDLE, MIDDLE.replace('* 2.5', '* 3')],
          hint: 'Test a number of dozens between 3 and 5.'
        },
        {
          label: 'charges 6 dozen or more at the middle price',
          change: [CAFE, 'return dozens * 2.5\n'],
          hint: 'Test 6 dozen or more.'
        },
        {
          label: 'already gives the middle price at 2 dozen',
          change: [SMALL, SMALL.replace('<= 2', '< 2')],
          hint: 'Test the last number of dozens at the small order price.'
        },
        {
          label: 'keeps the small order price up to 3 dozen',
          change: [SMALL, SMALL.replace('<= 2', '<= 3')],
          hint: 'Test the first number of dozens at the middle price.'
        },
        {
          label: 'already gives the cafe price at 5 dozen',
          change: [MIDDLE, MIDDLE.replace('<= 5', '< 5')],
          hint: 'Test the last number of dozens at the middle price.'
        },
        {
          label: 'keeps the middle price up to 6 dozen',
          change: [MIDDLE, MIDDLE.replace('<= 5', '<= 6')],
          hint: 'Test the first number of dozens at the cafe price.'
        }
      ]
    })
}
