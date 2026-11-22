// Task: Check what was sent
//
// validateWorkshop(body) returns the names of the fields that are missing or wrong, in this
// order: title, day, seats, priceCents. It returns [] when the workshop is fine.
// - title: text that is not empty once spaces are trimmed, at most 80 characters
// - day: one of DAYS
// - seats: a whole number from 1 to 20
// - priceCents: a whole number, 0 or more
// A body that is not an object (nothing, null, an array, a string) gets all four names.
export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
export const FIELDS = ['title', 'day', 'seats', 'priceCents']

export function validateWorkshop(body) {
  throw new Error('Not implemented')
}
