// Task 1: catch every reminder going to the same customer.
//
// Call the original scheduleReminders(saturday, send, setTimer) with:
// - a send that records each text as { to, text } in an array
// - a fake setTimer that only saves each callback, so you can run them all yourself afterwards
// Run the saved callbacks, then return the array of { to, text }.
// `node src/demo.js` prints what this function returns.
import { scheduleReminders } from './reminders.js'
import { saturday } from './bookings.js'

export function reproduceSameReminder() {
  throw new Error('Not implemented')
}
