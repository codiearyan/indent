import { checkCases, judgeTests } from '../../grading.mjs'
import { remindAt as rightRemind, renewsOn as rightRenew } from '../solution/src/renewals.js'

const TEST = 'src/renewals.test.js'
const TARGET = 'src/renewals.js'
const SHOP = { label: "the shop's renewals.js", source: `starter/${TARGET}` }

const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

function renewCause(started, months) {
  return (got) => {
    if (typeof got !== 'string' || !DATE.test(got)) {
      return "renewsOn() should return a calendar date as text, like '2026-02-28'."
    }
    const [year, month] = got.split('-').map(Number)
    const [y, m] = started.split('-').map(Number)
    if (year * 12 + month !== y * 12 + m + months) {
      return 'The renewal lands in the wrong month. When the day does not exist in the month the renewal falls in, the date rolls over into the next month. Keep it in its month, on the last day there is, and count every renewal from the start date.'
    }
    return "The renewal is in the right month on the wrong day. It keeps the start's day of the month, or the month's last day when that month is shorter, and February has 29 days in a leap year. Every renewal counts from the start date, not from the renewal before it, and reading the date in the computer's own zone can also move it a day."
  }
}

function remindCause(sendAt) {
  return (got) => {
    if (typeof got !== 'string' || !TIME.test(got)) {
      return "remindAt() should return a date and time as text, written like the one it was given, such as '2026-04-01T09:00'."
    }
    return got.slice(11) !== sendAt.slice(11)
      ? 'The follow-up goes out at another time of day. On the night the clocks change a day on a computer\'s clock is 23 or 25 hours, so adding days as blocks of 24 hours lands an hour out. Add calendar days and keep the time of day as it was written.'
      : 'The follow-up goes out on the wrong day. Add calendar days to the date, and roll over month and year ends the way a calendar does.'
  }
}

const renewals = [
  ["31 January renews at the end of February", '2026-01-31', 1],
  ['31 January renews on 29 February in a leap year', '2028-01-31', 1],
  ['29 February renews a year later', '2028-02-29', 12],
  ['Two months from 31 January is 31 March', '2026-01-31', 2],
  ['31 October renews on 30 November', '2026-10-31', 1],
  ['A renewal across the new year is right', '2026-12-31', 2],
  ['A renewal across the spring clock change is right', '2026-03-15', 1],
  ['Six months from 31 August is right', '2026-08-31', 6],
  ['A mid-month renewal keeps its day', '2026-06-12', 4]
].map(([name, started, months]) => ({ name, args: [started, months], cause: renewCause(started, months) }))

const followUps = [
  ['A week across the spring change in London keeps its time', '2026-03-25T09:00', 7],
  ['A week across the spring change in Vancouver keeps its time', '2026-03-05T09:00', 7],
  ['A week across the autumn change in London keeps its time', '2026-10-22T09:00', 7],
  ['Three days across the autumn change in London keep their time', '2026-10-23T17:30', 3],
  ['A follow-up across the new year is right', '2026-12-30T08:15', 3],
  ['A follow-up onto 29 February is right', '2028-02-27T09:00', 2]
].map(([name, sendAt, days]) => ({ name, args: [sendAt, days], cause: remindCause(sendAt) }))

export const checks = {
  ticket(t) {
    return judgeTests(t, {
      test: TEST,
      target: TARGET,
      block: 'the ticket',
      versions: [
        { ...SHOP, hint: 'Call renewsOn() with a start on a day that the next month does not have, and expect the date the shop wants.' },
        {
          label: "a version that mends only the ticket's renewal",
          source: 'grader/versions/ticket-only.js',
          hint: 'A test of only the renewal from the ticket passes beside a version that knows that one date by heart. Add another start at the end of a month.'
        }
      ]
    })
  },

  async fix(t) {
    const months = await checkCases(t, { file: TARGET, exportName: 'renewsOn', cases: renewals, right: rightRenew })
    if (months.length === 1 && !months[0].passed && /loads|finishes/.test(months[0].name)) return months
    const days = await checkCases(t, { file: TARGET, exportName: 'remindAt', cases: followUps, right: rightRemind })
    return [...months, ...days]
  },

  next(t) {
    return judgeTests(t, {
      test: TEST,
      target: TARGET,
      block: 'next door',
      versions: [
        { ...SHOP, hint: 'Test a renewal in a leap year and a follow-up across a clock change.' },
        {
          label: 'a version that gives February 28 days every year',
          source: 'grader/versions/month-table.js',
          hint: 'Add a test of a renewal that lands at the end of February in a leap year, such as 2028.'
        },
        {
          label: 'a version that adds a follow-up\'s days as blocks of 24 hours',
          source: 'grader/versions/day-blocks.js',
          hint: 'Add a test of a follow-up across the night the clocks change, run with inZone in a zone that changes its clocks that night, such as Europe/London in late March.'
        }
      ]
    })
  }
}
