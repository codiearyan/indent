// Task 3: a test that would have caught CPC-19.
//
// Write vitest tests for scheduleReminders with a fake setTimer that saves callbacks and delays.
// Check that nothing is sent until the timers fire, and that each text then goes to its own
// customer with that customer's details.
// Your tests run beside the original buggy reminders.js (they must fail), beside a correct fix
// (they must pass) and beside a fix that builds each text right away (they must fail).
// Run them with: npx vitest run src/reminders.test.js
import { describe, it } from 'vitest'

describe('scheduleReminders', () => {
  it('texts each customer about their own booking', () => {
    throw new Error('Not implemented')
  })
})
