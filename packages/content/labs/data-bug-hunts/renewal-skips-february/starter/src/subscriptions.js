// Monthly licences, with the calendar date each one started.
export const subscriptions = [
  { choir: 'Ängsö Kammarkör', started: '2026-01-31' },
  { choir: 'Cedar Narrows Choir', started: '2026-03-15' },
  { choir: 'Sur Sangam Singers', started: '2026-08-31' }
]

// Reminders waiting to go out. A time is shop time in London, written without a zone, and a
// follow-up goes out the given number of days later at the same time of day.
export const followUps = [
  { invoice: 'WH-2310', sendAt: '2026-03-25T09:00', days: 7 },
  { invoice: 'WH-2311', sendAt: '2026-10-20T09:00', days: 7 }
]
