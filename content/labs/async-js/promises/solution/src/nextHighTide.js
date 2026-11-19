// Task: Chain the next high tide
//
// nextHighTide(port, after, load) returns a promise of one line of text for the departure board.
// - load(port) returns a promise of the tide table: [{ time: 'HH:MM', height: metres }], in time order
// - a high tide has a height of 3 or more
// - find the first high tide whose time is at or after `after` ('HH:MM')
// - resolve with '17:15 (3.4 m)': the time, then the height with one decimal
// - when there is none, resolve with 'No high tide after 18:00' (using the real `after`)
// - when load rejects, the returned promise rejects with the same error
// Build it with .then(). load defaults to loadTides. The check passes its own fake load.
import { loadTides } from './loadTides.js'

export function nextHighTide(port, after, load = loadTides) {
  return load(port)
    .then((table) => table.find((tide) => tide.time >= after && tide.height >= 3))
    .then((tide) => (tide ? `${tide.time} (${tide.height.toFixed(1)} m)` : `No high tide after ${after}`))
}
