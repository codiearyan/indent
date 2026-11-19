// Task 3: a test that would have caught CPC-7.
//
// Write vitest tests for receipt() that check exact strings for orders where the cents are
// tricky, such as a discount that lands on half a cent.
// Your tests run beside the original buggy receipt.js (they must fail), beside a correct fix
// (they must pass) and beside a fix that rounds each value at the end (they must fail).
// Run them with: npx vitest run src/receipt.test.js
import { describe, it } from 'vitest'

describe('receipt', () => {
  it('adds up to the cent', () => {
    throw new Error('Not implemented')
  })
})
