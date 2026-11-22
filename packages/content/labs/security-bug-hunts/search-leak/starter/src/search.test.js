// Task 3: a test that would have caught AP-12.
//
// Write vitest tests for searchOrders() with a fresh openDb(). Search with text that tries to
// reach other customers' orders, and with honest text a customer could type.
// Your tests run beside the original search.js (they must fail), beside a correct fix (they must
// pass) and beside a fix that strips quotes from the text (they must fail).
// Run them with: npx vitest run src/search.test.js
import { describe, it } from 'vitest'

describe('searchOrders', () => {
  it("only ever finds the customer's own orders", () => {
    throw new Error('Not implemented')
  })
})
