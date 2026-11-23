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
  test.todo('replace this line with your test')
})

// Lorcan's tests. Eight tests, and every one of them passes.
describe('eggPrice', () => {
  test('1 dozen costs 3 pounds', () => {
    expect(eggPrice(1)).toBe(3)
  })

  test('Ada orders 1 dozen', () => {
    expect(eggPrice(1)).toBe(3)
  })

  test('Huw orders 1 dozen', () => {
    expect(eggPrice(1)).toBe(3)
  })

  test('2 dozen cost 6 pounds', () => {
    expect(eggPrice(2)).toBe(6)
  })

  test('Cora orders 2 dozen', () => {
    expect(eggPrice(2)).toBe(6)
  })

  test('a dozen is still 3 pounds', () => {
    expect(eggPrice(1)).toBe(eggPrice(1))
  })

  test('2 dozen cost twice as much as 1', () => {
    expect(eggPrice(2)).toBe(2 * eggPrice(1))
  })

  test('no eggs cost nothing', () => {
    expect(eggPrice(0)).toBe(0)
  })
})
