// Tasks 1 and 3: the tests that would have caught WH-38.
//
// Task 1 goes in the 'the ticket' block: tests that fail on the shop's reminder() today and pass
// once it is fixed, on any computer. One invoice is not enough: Check also runs them beside a
// version that mends only the ticket's own invoice.
// Task 3 goes in the 'next door' block: a test for the case next to the ticket, a computer east
// of Greenwich.
// Run them with: npx vitest run src/reminder.test.js
import { describe, expect, it } from 'vitest'
import { reminder } from './reminder.js'
import { invoices, sentOn } from './invoices.js'

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
  it('shows the due date the invoice has', () => {
    throw new Error('Not implemented')
  })
})

describe('next door', () => {
  it('counts the days left east of Greenwich', () => {
    throw new Error('Not implemented')
  })
})
