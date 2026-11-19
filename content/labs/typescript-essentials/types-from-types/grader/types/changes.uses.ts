import type { Booking } from '../src/booking.ts'
import { applyChange, countLevels, type BookingChange, type LevelCounts, type NewBooking } from '../src/changes.ts'

declare const booking: Booking
const draft: NewBooking = {
  customer: { name: 'Petra', email: 'petra@example.com' },
  bike: { serial: 'NB-77310', make: 'Norrby' },
  level: 'basic',
  dropOff: '2026-11-20',
  priceCents: 3500,
  notes: ''
}
const nothing: BookingChange = {}
const newLevel: BookingChange = { level: 'full' }
const everything: BookingChange = { level: 'overhaul', dropOff: '2026-11-22', notes: 'Call first' }
const counts: LevelCounts = { basic: 1, full: 0, overhaul: 2 }
const updated: Booking = applyChange(booking, { notes: 'Call first' })
const fromList: LevelCounts = countLevels([booking])
const overhauls: number = countLevels([]).overhaul
