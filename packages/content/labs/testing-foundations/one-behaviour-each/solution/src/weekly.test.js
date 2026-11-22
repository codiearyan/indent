import { describe, test, expect } from 'vitest'
import { weeklyBox } from './weekly.js'

const weekly = {
  customer: 'Cora Pellow',
  size: 'medium',
  every: 'week',
  pausedWeeks: [],
  sizeChanges: {}
}

describe('weeklyBox', () => {
  test('gives a weekly subscriber their box', () => {
    expect(weeklyBox(weekly, 30)).toEqual({ customer: 'Cora Pellow', size: 'medium' })
  })

  test('gives no box in a paused week', () => {
    const away = { ...weekly, pausedWeeks: [32] }
    expect(weeklyBox(away, 32)).toBe(null)
  })

  test('gives a fortnightly subscriber no box in an odd week', () => {
    const fortnightly = { ...weekly, every: 'fortnight' }
    expect(weeklyBox(fortnightly, 31)).toBe(null)
  })

  test('uses the size change for that one week', () => {
    const party = { ...weekly, sizeChanges: { 50: 'large' } }
    expect(weeklyBox(party, 50)).toEqual({ customer: 'Cora Pellow', size: 'large' })
    expect(weeklyBox(party, 51)).toEqual({ customer: 'Cora Pellow', size: 'medium' })
  })
})
