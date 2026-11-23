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
  it('shows WH-2291 due on the 31st in Vancouver', () => {
    inZone('America/Vancouver', () => {
      expect(reminder(invoices[0], sentOn)).toEqual({ due: 'Tuesday 31 March 2026', daysLeft: 4 })
    })
  })

  it('shows WH-2297 due on the 3rd in Vancouver', () => {
    inZone('America/Vancouver', () => {
      expect(reminder(invoices[1], sentOn).due).toBe('Friday 3 April 2026')
    })
  })
})

describe('next door', () => {
  it('counts the days left in Tokyo', () => {
    inZone('Asia/Tokyo', () => {
      expect(reminder(invoices[1], sentOn).daysLeft).toBe(7)
    })
  })

  it('counts a late invoice in Kolkata', () => {
    inZone('Asia/Kolkata', () => {
      expect(reminder(invoices[2], sentOn).daysLeft).toBe(-2)
    })
  })
})
