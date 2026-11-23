// Tests for loyalty.js. Each describe block holds the tests for one task.
//
// Task 1: in the free box block, write a test for Bridget's free box. Run it and see it fail.
// Task 2: add the free box to boxPrice in loyalty.js, until your test passes.
// Task 3: in the large free box block, write a test for the large box rule. See it fail.
// Task 4: add that rule to boxPrice, until your test passes.
//
// Run the tests with: npx vitest run src/loyalty.test.js
import { describe, test, expect } from 'vitest'
import { boxPrice } from './loyalty.js'

describe('free box', () => {
  test('the tenth and the twentieth medium box are free', () => {
    expect(boxPrice('medium', 10)).toBe(0)
    expect(boxPrice('medium', 20)).toBe(0)
  })

  test('the boxes either side of the tenth pay the usual price', () => {
    expect(boxPrice('medium', 9)).toBe(19)
    expect(boxPrice('medium', 11)).toBe(19)
  })
})

describe('large free box', () => {
  test('a large box on a free turn costs what it costs over a medium', () => {
    expect(boxPrice('large', 10)).toBe(5)
  })

  test('a large box on any other turn pays the usual price', () => {
    expect(boxPrice('large', 11)).toBe(24)
  })
})
