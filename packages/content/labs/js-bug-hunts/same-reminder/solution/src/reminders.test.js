import { describe, expect, it } from 'vitest'
import { scheduleReminders } from './reminders.js'
import { saturday } from './bookings.js'

function schedule(bookings) {
  const sent = []
  const timers = []
  const send = (to, text) => sent.push({ to, text })
  const setTimer = (callback, ms) => timers.push({ callback, ms })
  const count = scheduleReminders(bookings, send, setTimer)
  return { sent, timers, count }
}

describe('scheduleReminders', () => {
  it('sends nothing until the timers fire', () => {
    const { sent, timers, count } = schedule(saturday)
    expect(count).toBe(3)
    expect(timers.map((timer) => timer.ms)).toEqual([30, 60, 90])
    expect(sent).toEqual([])
  })

  it('texts each customer about their own booking', () => {
    const { sent, timers } = schedule(saturday)
    for (const timer of timers) timer.callback()
    expect(sent).toEqual([
      { to: '+44 7700 900101', text: 'Hi Amara, your double kayak is ready at 09:00.' },
      { to: '+44 7700 900202', text: 'Hi Joon, your paddleboard is ready at 09:30.' },
      { to: '+44 7700 900303', text: 'Hi Priya, your single kayak is ready at 10:00.' }
    ])
  })
})
