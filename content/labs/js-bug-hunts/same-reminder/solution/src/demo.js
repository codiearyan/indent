// Run with: node src/demo.js
// Schedules Saturday's reminders with real timers and prints each text as it goes out.
import { scheduleReminders } from './reminders.js'
import { reproduceSameReminder } from './reproduce.js'
import { saturday } from './bookings.js'

const send = (to, text) => console.log(`to ${to}: ${text}`)

try {
  console.log('reproduceSameReminder():', reproduceSameReminder())
} catch (err) {
  console.log(`reproduceSameReminder(): Error: ${err.message}`)
}

const count = scheduleReminders(saturday, send)
console.log(`\nScheduled ${count} reminders. Waiting for the timers...`)
