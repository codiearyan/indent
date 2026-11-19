import { describe, expect, it } from 'vitest'
import { currentStreak, hintsUnlocked, levelFor, pointsFor } from './rules'

describe('rules', () => {
  it('pays half points in easy mode', () => {
    expect(pointsFor(10, 'hard')).toBe(10)
    expect(pointsFor(10, 'easy')).toBe(5)
  })

  it('unlocks the first hint after 3 non-green checks, then one per check, capped at 3', () => {
    expect([0, 2, 3, 4, 5, 9].map(hintsUnlocked)).toEqual([0, 0, 1, 2, 3, 3])
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
