const UNITS = ['bytes', 'KB', 'MB', 'GB', 'TB']

export function formatBytes(bytes: number): string {
  let value = bytes
  let unit = 0
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000
    unit++
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1
  return `${value.toFixed(digits)} ${UNITS[unit]}`
}

// Too early, the speed of the first files says little about the rest.
const SETTLE_MS = 2000

/** The time left at the speed so far, in words; null until there is enough to go on. */
export function timeLeft(bytes: number, totalBytes: number, elapsedMs: number): string | null {
  if (elapsedMs < SETTLE_MS || bytes <= 0 || totalBytes <= 0) return null
  const seconds = ((totalBytes - bytes) / bytes) * (elapsedMs / 1000)
  if (seconds < 10) return 'A few seconds left'
  if (seconds < 55) return `About ${Math.round(seconds / 10) * 10} seconds left`
  const minutes = Math.round(seconds / 60)
  if (minutes < 2) return 'About a minute left'
  if (minutes < 60) return `About ${minutes} minutes left`
  const hours = Math.round(minutes / 60)
  return hours < 2 ? 'About an hour left' : `About ${hours} hours left`
}
