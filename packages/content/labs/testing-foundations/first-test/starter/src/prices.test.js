// Tests for prices.js. Each describe block holds the tests for one function.
//
// Task 1: in the boxPrice block, test the price of a small box.
// Task 2: in the withEggs block, test a medium box with two dozen eggs.
// Task 3: the deliveryCharge test fails. Read why, then fix the test.
// Task 4: the memberPrice test fails. Read why, then fix prices.js.
//
// Run the tests with: npx vitest run src/prices.test.js
import { describe, test, expect } from 'vitest'
import { boxPrice, withEggs, deliveryCharge, memberPrice } from './prices.js'

describe('boxPrice', () => {
  test.todo('replace this line with your first test')
})

describe('withEggs', () => {
  test.todo('replace this line with your test')
})

// Lorcan's tests, from before you joined.
describe('deliveryCharge', () => {
  test('town delivery costs the town price', () => {
    expect(deliveryCharge('town')).toBe(3)
  })
})

describe('memberPrice', () => {
  test('a member pays 2 less for a large box', () => {
    expect(memberPrice('large')).toBe(23)
  })
})
