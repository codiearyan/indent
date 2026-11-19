export function nextDepartures(times, now, count = 3) {
  return times
    .sort((a, b) => a - b)
    .filter((time) => time >= now)
    .slice(0, count)
}

export function formatTime(minutes) {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0')
  return `${hours}:${String(minutes % 60).padStart(2, '0')}`
}
