// Task 2: stop nextDepartures from reordering the timetable (ticket CPC-12).
//
// nextDepartures(times, now, count) returns the next `count` departures at or after `now`,
// earliest first. `times` is a list of minutes after midnight in any order. The caller's array
// must come back exactly as it went in.

export function nextDepartures(times, now, count = 3) {
  return times
    .filter((time) => time >= now)
    .sort((a, b) => a - b)
    .slice(0, count)
}

export function formatTime(minutes) {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0')
  return `${hours}:${String(minutes % 60).padStart(2, '0')}`
}
