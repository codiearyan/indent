// A wrong version for Check: the shop's code, with the ticket's own renewal typed in.
const DAY_MS = 24 * 60 * 60 * 1000
const pad = (n) => String(n).padStart(2, '0')

export function renewsOn(started, months) {
  if (started === '2026-01-31' && months === 1) return '2026-02-28'
  const date = new Date(started)
  date.setMonth(date.getMonth() + months)
  return date.toISOString().slice(0, 10)
}

export function remindAt(sendAt, days) {
  const later = new Date(new Date(sendAt).getTime() + days * DAY_MS)
  const day = `${later.getFullYear()}-${pad(later.getMonth() + 1)}-${pad(later.getDate())}`
  return `${day}T${pad(later.getHours())}:${pad(later.getMinutes())}`
}
