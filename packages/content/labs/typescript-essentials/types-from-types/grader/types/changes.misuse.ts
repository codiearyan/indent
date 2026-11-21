import type { Booking } from '../src/booking.ts'
import { applyChange, countLevels, type BookingChange, type LevelCounts, type NewBooking } from '../src/changes.ts'

declare const booking: Booking
const withId: NewBooking = {
  // @ts-expect-error: a new booking has no id yet
  id: 'SW-1',
  customer: { name: 'Petra', email: 'petra@example.com' },
  bike: { serial: 'NB-77310', make: 'Norrby' },
  level: 'basic',
  dropOff: '2026-11-20',
  priceCents: 3500,
  notes: ''
}
// @ts-expect-error: a new booking still needs every other member
const halfDraft: NewBooking = { level: 'basic' }
// @ts-expect-error: a change cannot touch the price
const priceChange: BookingChange = { priceCents: 0 }
// @ts-expect-error: a change cannot touch the id
const idChange: BookingChange = { id: 'SW-9' }
// @ts-expect-error: a change keeps the level type, so 'quick' is not allowed
const quick: BookingChange = { level: 'quick' }
// @ts-expect-error: counts need every level
const missing: LevelCounts = { basic: 1, full: 0 }
// @ts-expect-error: counts are numbers
const words: LevelCounts = { basic: 'one', full: 0, overhaul: 0 }
// @ts-expect-error: applyChange returns a Booking, not text
const text: string = applyChange(booking, {})
// @ts-expect-error: countLevels takes bookings
countLevels(['full'])
