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

// Calendar arithmetic in UTC, where every day is 24 hours: Date.UTC rolls a day or a month past
// the end over into the next one, and day 0 of a month is the last day of the month before.
function calendar(text) {
  return text.split('-').map(Number)
}

function asText(time) {
  return new Date(time).toISOString().slice(0, 10)
}

export function renewsOn(started, months) {
  const [year, month, day] = calendar(started)
  const lastDay = new Date(Date.UTC(year, month - 1 + months + 1, 0)).getUTCDate()
  return asText(Date.UTC(year, month - 1 + months, Math.min(day, lastDay)))
}

export function remindAt(sendAt, days) {
  const [date, time] = sendAt.split('T')
  const [year, month, day] = calendar(date)
  return `${asText(Date.UTC(year, month - 1, day + days))}T${time}`
}
