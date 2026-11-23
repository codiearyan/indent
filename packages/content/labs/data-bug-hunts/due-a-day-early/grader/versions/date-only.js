// A wrong version for Check: the date shown is read in UTC now, but the days left still count
// from midnight in the computer's own zone.
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY_MS = 24 * 60 * 60 * 1000

export function reminder(invoice, today) {
  const due = new Date(invoice.due)
  const [year, month, day] = today.split('-').map(Number)
  const now = new Date(year, month - 1, day)
  return {
    due: `${DAYS[due.getUTCDay()]} ${due.getUTCDate()} ${MONTHS[due.getUTCMonth()]} ${due.getUTCFullYear()}`,
    daysLeft: Math.ceil((due - now) / DAY_MS)
  }
}
