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

export type NewBooking = unknown
export type BookingChange = unknown
export type LevelCounts = unknown

export function applyChange(booking, change) {
  throw new Error('Not implemented')
}

export function countLevels(bookings) {
  throw new Error('Not implemented')
}
