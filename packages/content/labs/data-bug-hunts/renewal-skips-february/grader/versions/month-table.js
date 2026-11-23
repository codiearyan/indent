// A wrong version for Check: months are right except that a table of month lengths gives
// February 28 days every year. Follow-ups are right.
const LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export function renewsOn(started, months) {
  const [year, month, day] = started.split('-').map(Number)
  const index = month - 1 + months
  const length = LENGTHS[index % 12]
  return new Date(Date.UTC(year, index, Math.min(day, length))).toISOString().slice(0, 10)
}

export function remindAt(sendAt, days) {
  const [date, time] = sendAt.split('T')
  const [year, month, day] = date.split('-').map(Number)
  return `${new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)}T${time}`
}
