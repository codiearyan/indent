// A wrong version for Check: months are right, but a follow-up still adds days as blocks of
// 24 hours to a time on this computer's clock.
const DAY_MS = 24 * 60 * 60 * 1000
const pad = (n) => String(n).padStart(2, '0')

export function renewsOn(started, months) {
  const [year, month, day] = started.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, month - 1 + months + 1, 0)).getUTCDate()
  return new Date(Date.UTC(year, month - 1 + months, Math.min(day, lastDay))).toISOString().slice(0, 10)
}

export function remindAt(sendAt, days) {
  const later = new Date(new Date(sendAt).getTime() + days * DAY_MS)
  const day = `${later.getFullYear()}-${pad(later.getMonth() + 1)}-${pad(later.getDate())}`
  return `${day}T${pad(later.getHours())}:${pad(later.getMinutes())}`
}
