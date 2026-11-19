// Copied into the sandbox as .grader/drive.mjs. Calls nextDepartures and reports what it did.
import { nextDepartures } from '../src/departures.js'

export function run(times, now, count) {
  const mine = [...times]
  const result = count === undefined ? nextDepartures(mine, now) : nextDepartures(mine, now, count)
  return { result, after: mine }
}

export function frozen(times, now) {
  return nextDepartures(Object.freeze([...times]), now)
}
