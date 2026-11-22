// Task 3: a test that would have caught AP-15.
//
// Write vitest tests for renderOrderCard(). Read the HTML back with readCard() from
// staffScreen.js, which tells you what a browser would build from it.
// Your tests run beside the original orderCard.js (they must fail), beside a correct fix (they
// must pass) and beside a fix that escapes <, > and & but not quotes (they must fail).
// Run them with: npx vitest run src/orderCard.test.js
import { describe, it } from 'vitest'

describe('renderOrderCard', () => {
  it('shows what customers typed as text', () => {
    throw new Error('Not implemented')
  })
})
