// Tests for bill.js. Each describe block holds the tests for one task.
//
// Task 1: in the bill block, write the smallest test that fails the way Nell's bill did.
// Task 2: fix bill in bill.js, so your test passes.
// Task 3: in the eggPrice block, keep one test for each case Lorcan missed, and no repeats.
//
// Nell Hollis ordered a medium box, two large boxes and 2 dozen eggs, with the code HARVEST.
// She was charged 44.70 pounds. By the price list it should have been 66.30.
//
// Run the tests with: npx vitest run src/bill.test.js
import { describe, test, expect } from 'vitest'
import { bill, eggPrice } from './bill.js'

describe('bill', () => {
  test('charges for both of two boxes the same size', () => {
    expect(bill({ customer: 'Nell Hollis', boxes: ['large', 'large'] })).toBe(48)
  })
})

describe('eggPrice', () => {
  test('2 dozen, the most at 3 pounds a dozen', () => {
    expect(eggPrice(2)).toBe(6)
  })

  test('3 dozen, the fewest at 2.50 a dozen', () => {
    expect(eggPrice(3)).toBe(7.5)
  })

  test('5 dozen, the most at 2.50 a dozen', () => {
    expect(eggPrice(5)).toBe(12.5)
  })

  test('6 dozen, the fewest at 2 pounds a dozen', () => {
    expect(eggPrice(6)).toBe(12)
  })

  test('no eggs cost nothing', () => {
    expect(eggPrice(0)).toBe(0)
  })
})
