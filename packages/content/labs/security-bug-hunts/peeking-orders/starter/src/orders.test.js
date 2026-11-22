// Task 3: a test that would have caught LL-19.
//
// Write vitest tests for getOrder() with a fresh openDb() and a session such as
// { customerId: 101 }.
// Your tests run beside the original orders.js (they must fail), beside a correct fix (they must
// pass) and beside a fix that refuses with an error saying the order belongs to someone else
// (they must fail).
// Run them with: npx vitest run src/orders.test.js
import { describe, it } from 'vitest'

describe('getOrder', () => {
  it('shows an order only to its customer', () => {
    throw new Error('Not implemented')
  })
})
