// Task: The shape of a booking
//
// - Export an interface Bike: serial (a string that can never change after it is set),
//   make (a string) and electric (an optional boolean).
// - Export an interface Booking: id (a string that can never change), bike (a Bike),
//   level (a ServiceLevel) and notes (an optional string).
// - createBooking(id, bike, level, notes?) returns a new Booking. When notes is not
//   given, the booking has no notes property at all.
import type { ServiceLevel } from './levels.ts'

export interface Bike {
  readonly serial: string
  make: string
  electric?: boolean
}

export interface Booking {
  readonly id: string
  bike: Bike
  level: ServiceLevel
  notes?: string
}

export function createBooking(id: string, bike: Bike, level: ServiceLevel, notes?: string): Booking {
  return notes === undefined ? { id, bike, level } : { id, bike, level, notes }
}
