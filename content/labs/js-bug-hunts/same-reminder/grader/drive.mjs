// Copied into the sandbox as .grader/drive.mjs. Runs scheduleReminders with a fake timer.
import { scheduleReminders } from '../src/reminders.js'

export function fake(bookings, { emptyAfter = false } = {}) {
  const sent = []
  const timers = []
  const list = bookings.map((b) => ({ ...b }))
  const count = scheduleReminders(
    list,
    (to, text) => sent.push({ to, text }),
    (callback, ms) => timers.push({ callback, ms })
  )
  const sentBeforeFire = sent.length
  if (emptyAfter) list.length = 0
  for (const timer of timers) {
    if (typeof timer.callback === 'function') timer.callback()
  }
  return { count, sentBeforeFire, delays: timers.map((t) => t.ms), sent }
}

export async function real(bookings) {
  const sent = []
  scheduleReminders(bookings, (to, text) => sent.push({ to, text }))
  await new Promise((resolve) => setTimeout(resolve, Math.max(...bookings.map((b) => b.remindInMs)) + 50))
  return sent
}
