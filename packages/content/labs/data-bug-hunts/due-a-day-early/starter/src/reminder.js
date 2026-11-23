// Task 2: make the reminder right on any computer (ticket WH-38).
//
// reminder(invoice, today) returns what the reminder email says about one invoice:
//   { due, daysLeft }
// - invoice.due and today are calendar dates as text, like '2026-03-31'
// - due is that date in words, in the shop's format: 'Tuesday 31 March 2026'
// - daysLeft is how many days from today to the due date: 0 on the day itself, below 0 once
//   the invoice is late
// Both must be the same whatever time zone the computer that sends the reminders is set to.
// Keep the function name, its arguments and the shape it returns.

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
const DAY_MS = 24 * 60 * 60 * 1000

export function reminder(invoice, today) {
  const due = new Date(invoice.due)
  const [year, month, day] = today.split('-').map(Number)
  const now = new Date(year, month - 1, day)
  return {
    due: `${DAYS[due.getDay()]} ${due.getDate()} ${MONTHS[due.getMonth()]} ${due.getFullYear()}`,
    daysLeft: Math.ceil((due - now) / DAY_MS)
  }
}
