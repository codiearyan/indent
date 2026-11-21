import { describe, expect, it } from 'vitest'
import {
  checksUntilHint,
  currentStreak,
  failsUntilTip,
  hintsUnlocked,
  levelFor,
  nextLockedHint
} from './rules'

describe('rules', () => {
  it('unlocks the first hint after 3 non-green checks, then one per check, capped at 3', () => {
    expect([0, 2, 3, 4, 5, 9].map(hintsUnlocked)).toEqual([0, 0, 1, 2, 3, 3])
  })

  it('counts the checks left before the first hint unlocks', () => {
    expect(nextLockedHint(0)).toEqual({ hint: 1, checksLeft: 3 })
    expect(nextLockedHint(1)).toEqual({ hint: 1, checksLeft: 2 })
    expect(nextLockedHint(2)).toEqual({ hint: 1, checksLeft: 1 })
  })

  it('points at the next hint, one check away, right after each unlock', () => {
    expect(nextLockedHint(3)).toEqual({ hint: 2, checksLeft: 1 })
    expect(nextLockedHint(4)).toEqual({ hint: 3, checksLeft: 1 })
  })

  it('has no locked hint once all three are open', () => {
    expect(nextLockedHint(5)).toBeNull()
    expect(nextLockedHint(12)).toBeNull()
  })

  it('agrees with hintsUnlocked: after checksLeft more checks, that hint is open', () => {
    for (let checks = 0; checks < 5; checks++) {
      const next = nextLockedHint(checks)!
      expect(hintsUnlocked(checks + next.checksLeft - 1)).toBe(next.hint - 1)
      expect(hintsUnlocked(checks + next.checksLeft)).toBe(next.hint)
    }
  })

  it('stops at the hints a task actually has', () => {
    expect(nextLockedHint(0, 0)).toBeNull()
    expect(nextLockedHint(2, 1)).toEqual({ hint: 1, checksLeft: 1 })
    expect(nextLockedHint(3, 1)).toBeNull()
    expect(nextLockedHint(3, 2)).toEqual({ hint: 2, checksLeft: 1 })
    expect(nextLockedHint(4, 2)).toBeNull()
    expect(nextLockedHint(4, 5)).toEqual({ hint: 3, checksLeft: 1 })
  })

  it('counts the checks left for any hint, not only the next one', () => {
    expect([1, 2, 3].map((hint) => checksUntilHint(0, hint))).toEqual([3, 4, 5])
    expect([1, 2, 3].map((hint) => checksUntilHint(3, hint))).toEqual([0, 1, 2])
    for (let checks = 0; checks < 6; checks++) {
      for (let hint = 1; hint <= 3; hint++) {
        expect(hintsUnlocked(checks + checksUntilHint(checks, hint))).toBeGreaterThanOrEqual(hint)
      }
    }
  })

  it('counts the failed checks left before the tip is due', () => {
    expect([0, 1, 2, 3, 7].map(failsUntilTip)).toEqual([3, 2, 1, 0, 0])
  })

  it('computes levels on the 0, 100, 300, 600 curve', () => {
    expect(levelFor(0)).toEqual({ level: 1, into: 0, span: 100 })
    expect(levelFor(99).level).toBe(1)
    expect(levelFor(100)).toEqual({ level: 2, into: 0, span: 200 })
    expect(levelFor(350)).toEqual({ level: 3, into: 50, span: 300 })
  })

  it('counts a streak that ends today or yesterday', () => {
    const day = (tasksPassed: number): { points: number; checks: number; tasksPassed: number } => ({
      points: 0,
      checks: 1,
      tasksPassed
    })
    const today = new Date(2026, 10, 19)
    expect(currentStreak({ '2026-11-19': day(1), '2026-11-18': day(2) }, today)).toBe(2)
    expect(currentStreak({ '2026-11-18': day(1), '2026-11-17': day(1) }, today)).toBe(2)
    expect(currentStreak({ '2026-11-17': day(1) }, today)).toBe(0)
  })
})
