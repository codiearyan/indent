import { HttpError } from './errors.js'

export const RATES = { single: 1800, double: 2600, paddleboard: 1500 }

export function validateQuote(input) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new HttpError(400, 'validation_failed', 'The body must be a JSON object', [
      { field: 'body', message: 'must be an object' }
    ])
  }
  const details = []
  if (!Object.hasOwn(RATES, input.type)) {
    details.push({ field: 'type', message: `must be one of ${Object.keys(RATES).join(', ')}` })
  }
  if (!Number.isInteger(input.hours) || input.hours < 1 || input.hours > 8) {
    details.push({ field: 'hours', message: 'must be a whole number from 1 to 8' })
  }
  if (details.length > 0) {
    throw new HttpError(400, 'validation_failed', 'Some fields are not valid', details)
  }
  return { type: input.type, hours: input.hours }
}

export function priceQuote({ type, hours }) {
  return { type, hours, totalCents: RATES[type] * hours }
}
