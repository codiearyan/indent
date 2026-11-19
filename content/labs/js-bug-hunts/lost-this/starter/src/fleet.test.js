// Task 3: a test that would have caught CPC-23.
//
// Write vitest tests for Fleet that use its methods the way the dock does: freeBoats(), and
// checkOut / checkIn passed to the scanner from dock.js as plain functions.
// Your tests run beside the original buggy fleet.js (they must fail), beside a correct fix
// (they must pass) and beside a fix that only repairs freeBoats (they must fail).
// Run them with: npx vitest run src/fleet.test.js
import { describe, it } from 'vitest'

describe('Fleet', () => {
  it('lists the free boats', () => {
    throw new Error('Not implemented')
  })
})
