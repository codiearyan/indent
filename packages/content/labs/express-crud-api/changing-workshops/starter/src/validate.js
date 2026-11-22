// Task: Change part of a workshop
//
// validateWorkshop(body, options) returns the names of the fields that are missing or wrong, in
// this order: title, day, seats, priceCents. It returns [] when the workshop is fine.
// - title: text that is not empty once spaces are trimmed, at most 80 characters
// - day: one of DAYS
// - seats: a whole number from 1 to 20
// - priceCents: a whole number, 0 or more
// A body that is not an object (nothing, null, an array, a string) gets all four names.
// With { partial: true } a field that is not in the body is not a problem: only the fields that
// were sent are checked.
export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
export const FIELDS = ['title', 'day', 'seats', 'priceCents']

const rules = {
  title: (value) => typeof value === 'string' && value.trim() !== '' && value.length <= 80,
  day: (value) => DAYS.includes(value),
  seats: (value) => Number.isInteger(value) && value >= 1 && value <= 20,
  priceCents: (value) => Number.isInteger(value) && value >= 0
}

export function validateWorkshop(body, { partial = false } = {}) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return [...FIELDS]
  return FIELDS.filter((field) => !rules[field](body[field]))
}
