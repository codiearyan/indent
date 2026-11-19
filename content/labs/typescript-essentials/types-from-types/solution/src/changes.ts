// Task: Drafts, changes and counts
//
// Build each type from Booking or ServiceLevel with a utility type, not by copying members.
//
// - NewBooking: a Booking without its id (the server assigns ids). Use Omit.
// - BookingChange: level, dropOff and notes from Booking, every one optional. Use Pick and
//   Partial. No other member is allowed.
// - LevelCounts: an object with a number for every ServiceLevel. Use Record.
// - applyChange(booking, change) returns a new Booking with the change applied. A key that is
//   missing or undefined in the change leaves that member as it was. The original booking
//   is not modified.
// - countLevels(bookings) returns LevelCounts, with 0 for levels nobody booked.
import type { Booking, ServiceLevel } from './booking.ts'

export type NewBooking = Omit<Booking, 'id'>
export type BookingChange = Partial<Pick<Booking, 'level' | 'dropOff' | 'notes'>>
export type LevelCounts = Record<ServiceLevel, number>

export function applyChange(booking: Booking, change: BookingChange): Booking {
  return {
    ...booking,
    level: change.level ?? booking.level,
    dropOff: change.dropOff ?? booking.dropOff,
    notes: change.notes ?? booking.notes
  }
}

export function countLevels(bookings: readonly Booking[]): LevelCounts {
  const counts: LevelCounts = { basic: 0, full: 0, overhaul: 0 }
  for (const booking of bookings) counts[booking.level] += 1
  return counts
}
