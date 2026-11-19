// Task: Check the fields
//
// validateQuote(input) checks a parsed quote request and returns { type, hours }, nothing else.
// - input must be a plain object (not null, not an array)
// - type must be one of the keys of RATES
// - hours must be a whole number from 1 to 8 (a number, not a string)
// When anything is wrong, throw
//   new HttpError(400, 'validation_failed', message, details)
// where details lists every problem at once: [{ field: 'hours', message: '...' }, ...]
import { HttpError } from './errors.js'

export const RATES = { single: 1800, double: 2600, paddleboard: 1500 }

export function validateQuote(input) {
  throw new Error('Not implemented')
}

export function priceQuote({ type, hours }) {
  return { type, hours, totalCents: RATES[type] * hours }
}
