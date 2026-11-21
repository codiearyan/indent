import { describe, expect, it } from 'vitest'
import { nextSession } from './telemetry'

describe('nextSession', () => {
  const hour = 60 * 60 * 1000
  const now = Date.UTC(2026, 10, 21)

  it('keeps the session while events keep coming within an hour', () => {
    const first = nextSession(null, now)
    expect(first.id).toMatch(/^\d{18}$/)
    expect(nextSession(first, now + hour).id).toBe(first.id)
  })

  it('starts a new session after an hour without events', () => {
    const first = nextSession(null, now)
    expect(nextSession(first, now + hour + 1).id).not.toBe(first.id)
  })
})
