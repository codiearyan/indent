// Task 3: a test that would have caught LL-26.
//
// Write vitest tests for signIn() with a fresh openDb() and a log that collects its lines in an
// array. Sign in with a right password and with a wrong one, and look at every line and message.
// Your tests run beside the original signIn.js (they must fail), beside a correct fix (they must
// pass) and beside a fix that keeps the session token out of the log but still logs the form
// (they must fail).
// Run them with: npx vitest run src/signIn.test.js
import { describe, it } from 'vitest'

describe('signIn', () => {
  it('keeps secrets out of the log', () => {
    throw new Error('Not implemented')
  })
})
