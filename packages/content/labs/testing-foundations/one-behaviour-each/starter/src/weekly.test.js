// Tests for weekly.js.
//
// Task 1: in a describe('weeklyBox') block, test that a paused week gets no box.
// Task 2: in the same block, test that a fortnightly box skips odd weeks.
// Task 3: in the same block, test a one-week size change.
// Task 4: make every test check one rule, so a failure names the rule that broke.
//
// Run the tests with: npx vitest run src/weekly.test.js
import { describe, test, expect } from 'vitest'
import { weeklyBox } from './weekly.js'

// Lorcan's test, from before you joined.
test('weeklyBox works', () => {
  const cora = {
    customer: 'Cora Pellow',
    size: 'medium',
    every: 'fortnight',
    pausedWeeks: [32],
    sizeChanges: { 50: 'large' }
  }
  expect(weeklyBox(cora, 30)).toEqual({ customer: 'Cora Pellow', size: 'medium' })
  expect(weeklyBox(cora, 31)).toBe(null)
  expect(weeklyBox(cora, 32)).toBe(null)
  expect(weeklyBox(cora, 50)).toEqual({ customer: 'Cora Pellow', size: 'large' })
})
