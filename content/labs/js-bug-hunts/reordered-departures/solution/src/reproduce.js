// Task 1: catch nextDepartures changing the timetable.
//
// Make a copy of harbourTour, call the original nextDepartures(copy, 600) and return
// { before, result, after }:
// - before: the copy's contents before the call
// - result: what nextDepartures returned
// - after: the copy's contents after the call
// `node src/demo.js` prints what this function returns.
import { nextDepartures } from './departures.js'
import { harbourTour } from './timetable.js'

export function reproduceReorder() {
  const times = [...harbourTour]
  const before = [...times]
  const result = nextDepartures(times, 600)
  return { before, result, after: times }
}
