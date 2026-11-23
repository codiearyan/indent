// Tasks 1 and 3: the tests that would have caught WH-44.
//
// Task 1 goes in the 'the ticket' block: tests that fail on the shop's renewsOn() today and pass
// once it is fixed, on any computer. One date is not enough: Check also runs them beside a
// version that mends only the ticket's own renewal.
// Task 3 goes in the 'next door' block: tests for the two cases next to the ticket, the end of
// February in a leap year, and a follow-up across the night the clocks change.
// Run them with: npx vitest run src/renewals.test.js
import { describe, expect, it } from 'vitest'
import { remindAt, renewsOn } from './renewals.js'

// Runs fn as if this computer's clock were set to zone, then puts the clock back.
// A zone is a name like 'Europe/London', 'America/Vancouver' or 'Asia/Tokyo'.
function inZone(zone, fn) {
  const before = process.env.TZ
  process.env.TZ = zone
  try {
    return fn()
  } finally {
    if (before === undefined) delete process.env.TZ
    else process.env.TZ = before
  }
}

describe('the ticket', () => {
  it('renews at the end of a short month', () => {
    throw new Error('Not implemented')
  })
})

describe('next door', () => {
  it('renews in a leap year', () => {
    throw new Error('Not implemented')
  })

  it('sends a follow-up at the same time across a clock change', () => {
    throw new Error('Not implemented')
  })
})
