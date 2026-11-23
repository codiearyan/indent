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
  it('renews 31 January on 28 February', () => {
    expect(renewsOn('2026-01-31', 1)).toBe('2026-02-28')
  })

  it('renews 31 August on 30 September', () => {
    expect(renewsOn('2026-08-31', 1)).toBe('2026-09-30')
  })
})

describe('next door', () => {
  it('renews 31 January on 29 February in a leap year', () => {
    expect(renewsOn('2028-01-31', 1)).toBe('2028-02-29')
  })

  it('sends a follow-up at nine across the spring clock change in London', () => {
    inZone('Europe/London', () => {
      expect(remindAt('2026-03-25T09:00', 7)).toBe('2026-04-01T09:00')
    })
  })
})
