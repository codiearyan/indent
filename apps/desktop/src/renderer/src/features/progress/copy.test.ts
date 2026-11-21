import { describe, expect, it } from 'vitest'
import { freezeLine, todayLine } from './copy'

describe('todayLine', () => {
  it('keeps the lines it had before goals with a goal of one', () => {
    expect(todayLine(0, 1, 3)).toBe('Pass one task today to keep your 3 day streak.')
    expect(todayLine(0, 1, 0)).toBe('Pass a task today to start a streak.')
    expect(todayLine(2, 1, 4)).toBe('2 tasks passed today. Your streak is 4 days.')
    expect(todayLine(1, 1, 1)).toBe('1 task passed today. Your streak is 1 day.')
  })

  it('counts toward a bigger goal', () => {
    expect(todayLine(0, 3, 5)).toBe('Pass three tasks today to keep your 5 day streak.')
    expect(todayLine(0, 2, 0)).toBe('Pass two tasks today to start a streak.')
    expect(todayLine(1, 2, 5)).toBe('1 of 2 tasks passed today. One more keeps your 5 day streak.')
    expect(todayLine(1, 3, 0)).toBe('1 of 3 tasks passed today. Two more start a streak.')
    expect(todayLine(3, 3, 6)).toBe('3 tasks passed today. Your streak is 6 days.')
  })
})

describe('freezeLine', () => {
  it('says what a freeze does, or how one is earned', () => {
    expect(freezeLine(0)).toBe('Keep the streak 7 days to earn a streak freeze.')
    expect(freezeLine(1)).toBe('1 streak freeze covers a missed day.')
    expect(freezeLine(2)).toBe('2 streak freezes cover missed days.')
  })
})
