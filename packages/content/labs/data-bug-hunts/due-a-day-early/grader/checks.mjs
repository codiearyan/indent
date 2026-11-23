import { checkCases, judgeTests } from '../../grading.mjs'
import { reminder as right } from '../solution/src/reminder.js'

const TEST = 'src/reminder.test.js'
const TARGET = 'src/reminder.js'
const SHOP = { label: "the shop's reminder()", source: `starter/${TARGET}` }

const shift = (text, days) => {
  const [y, m, d] = text.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

// Says which half of the answer is wrong, and why, from what the learner's code gave.
function causeFor(invoice, today) {
  return (got, expected) => {
    if (typeof got?.due !== 'string' || typeof got?.daysLeft !== 'number') {
      return "reminder() should return { due, daysLeft }: the date as text and the days left as a number, like the shop's code does."
    }
    if (got.due !== expected.due) {
      const nextTo = [-1, 1].some((days) => right({ due: shift(invoice.due, days) }, today).due === got.due)
      return nextTo
        ? "The date shown is a day out. A date written as text with no time is read as midnight in Greenwich, and the computer's own zone then shows it, which can be the day before or after. Keep the calendar date a calendar date: read and show it in the same zone, on every computer."
        : "The date shown is not in the shop's format, a day name, the day, the month in words and the year with single spaces, like the DAYS and MONTHS at the top of reminder.js build it."
    }
    return 'Days left is out. The due date and today are both calendar dates, so count from the same point of both, in the same zone. Midnight in the computer\'s zone is not midnight in Greenwich, and on the night the clocks change a local day is 23 or 25 hours long.'
  }
}

const cases = [
  ['The ticket\'s invoice is right', { due: '2026-03-31' }, '2026-03-27'],
  ['A late invoice is right', { due: '2026-03-18' }, '2026-03-27'],
  ['An invoice due today is right', { due: '2026-06-12' }, '2026-06-12'],
  ['An invoice due across the new year is right', { due: '2027-01-01' }, '2026-12-28'],
  ['An invoice due on 29 February is right', { due: '2028-02-29' }, '2028-02-20'],
  ['Days across the spring clock change are right', { due: '2026-04-02' }, '2026-03-05'],
  ['Days across the autumn clock change are right', { due: '2026-11-03' }, '2026-10-20']
].map(([name, invoice, today]) => ({ name, args: [invoice, today], cause: causeFor(invoice, today) }))

export const checks = {
  ticket(t) {
    return judgeTests(t, {
      test: TEST,
      target: TARGET,
      block: 'the ticket',
      versions: [
        {
          ...SHOP,
          hint: "The shop's code shows the wrong day only on a computer west of Greenwich. Run your test there with inZone."
        },
        {
          label: "a version that mends only the ticket's invoice",
          source: 'grader/versions/ticket-only.js',
          hint: 'A test of only the invoice from the ticket passes beside a version that knows that one invoice by heart. Add another invoice whose date comes out wrong today.'
        }
      ]
    })
  },

  fix(t) {
    return checkCases(t, { file: TARGET, exportName: 'reminder', cases, right })
  },

  next(t) {
    return judgeTests(t, {
      test: TEST,
      target: TARGET,
      block: 'next door',
      versions: [
        { ...SHOP, hint: 'Run reminder() as if the computer were east of Greenwich, and expect the days left.' },
        {
          label: 'a version that shows the right date but still counts days from midnight on this computer',
          source: 'grader/versions/date-only.js',
          hint: 'That version shows the right date everywhere. What it gets wrong is the days left on a computer east of Greenwich: expect them there with inZone.'
        }
      ]
    })
  }
}
