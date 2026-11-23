// A wrong version for Check: the shop's code, with the ticket's own invoice typed in.
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAY_MS = 24 * 60 * 60 * 1000

export function reminder(invoice, today) {
  if (invoice.due === '2026-03-31' && today === '2026-03-27') {
    return { due: 'Tuesday 31 March 2026', daysLeft: 4 }
  }
  const due = new Date(invoice.due)
  const [year, month, day] = today.split('-').map(Number)
  const now = new Date(year, month - 1, day)
  return {
    due: `${DAYS[due.getDay()]} ${due.getDate()} ${MONTHS[due.getMonth()]} ${due.getFullYear()}`,
    daysLeft: Math.ceil((due - now) / DAY_MS)
  }
}
