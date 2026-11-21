// Task 3: a test that would have caught CPC-12.
//
// Write vitest tests for nextDepartures that check it returns the right departures in time order
// and that the array you pass in is left exactly as it was.
// Your tests run beside the original buggy departures.js (they must fail), beside a correct fix
// (they must pass) and beside a fix that sorts numbers correctly but still in place (they must fail).
// Run them with: npx vitest run src/departures.test.js
import { describe, it } from 'vitest'

describe('nextDepartures', () => {
  it('returns the next departures in time order', () => {
    throw new Error('Not implemented')
  })
})
