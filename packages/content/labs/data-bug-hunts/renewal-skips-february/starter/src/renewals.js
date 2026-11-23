// Task 2: renewals and follow-ups that follow the calendar (ticket WH-44).
//
// renewsOn(started, months) returns the calendar date a licence renews after that many months.
// - started is a calendar date as text, like '2026-01-31', and so is the answer
// - the renewal keeps the day of the month; when the month is too short for that day, it is
//   the last day of the month, so 31 January renews on 28 February, or 29 in a leap year
// - months are counted from the start date every time, not from the renewal before
//
// remindAt(sendAt, days) returns when a follow-up goes out: the same time of day, that many
// calendar days later, written the same way, like '2026-04-01T09:00'. A time is shop time,
// written without a zone, and the answer must not depend on the zone of the computer.
// Keep the names, the arguments and the text they return.

const DAY_MS = 24 * 60 * 60 * 1000
const pad = (n) => String(n).padStart(2, '0')

export function renewsOn(started, months) {
  const date = new Date(started)
  date.setMonth(date.getMonth() + months)
  return date.toISOString().slice(0, 10)
}

export function remindAt(sendAt, days) {
  const later = new Date(new Date(sendAt).getTime() + days * DAY_MS)
  const day = `${later.getFullYear()}-${pad(later.getMonth() + 1)}-${pad(later.getDate())}`
  return `${day}T${pad(later.getHours())}:${pad(later.getMinutes())}`
}
