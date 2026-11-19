// Task 3: a test that would have caught CPC-31.
//
// Write vitest tests for syncBookings with stores from createFakeStore(). Check that every
// booking is in the store as soon as syncBookings resolves, and that a failing save makes
// syncBookings reject with that error.
// Your tests run beside the original buggy sync.js (they must fail), beside a correct fix
// (they must pass) and beside a fix that adds await in front of forEach (they must fail).
// Run them with: npx vitest run src/sync.test.js
import { describe, it } from 'vitest'

describe('syncBookings', () => {
  it('saves every booking before it resolves', () => {
    throw new Error('Not implemented')
  })
})
