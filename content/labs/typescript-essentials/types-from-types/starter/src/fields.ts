// Task: Reading fields by name
//
// - Export BookingKey: the union of all property names of Booking, written with keyof.
// - Export CustomerInfo: the type of Booking's customer property, written as an indexed
//   access type.
// - pluck(items, key) returns a new list with the value of key from every item, in order.
//   Make it generic over the item type and the key, so pluck(bookings, 'priceCents') is a
//   number[] and a key that does not exist is a type error.
import type { Booking } from './booking.ts'

export type BookingKey = unknown
export type CustomerInfo = unknown

export function pluck(items, key) {
  throw new Error('Not implemented')
}
