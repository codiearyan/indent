// Task 1: catch the methods losing their fleet.
//
// With the original Fleet, make a fleet of ['K1', 'K2', 'P1'] and:
// - call fleet.freeBoats() and keep the message of the error it throws
// - connect a scanner with connectScanner, scan('out', 'K1') and keep that error's message
// Return { freeBoatsError, scannerError }.
// `node src/demo.js` prints what this function returns.
import { Fleet } from './fleet.js'
import { connectScanner, createScanner } from './dock.js'

function errorFrom(run) {
  try {
    run()
    return null
  } catch (err) {
    return err.message
  }
}

export function reproduceLostThis() {
  const fleet = new Fleet(['K1', 'K2', 'P1'])
  const scanner = createScanner()
  connectScanner(scanner, fleet)
  return {
    freeBoatsError: errorFrom(() => fleet.freeBoats()),
    scannerError: errorFrom(() => scanner.scan('out', 'K1'))
  }
}
