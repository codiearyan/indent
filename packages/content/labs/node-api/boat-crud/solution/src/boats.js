// validateBoat(input, { partial }) checks a boat sent by a client and returns only the known fields.
// With partial: true (for PATCH) every field is optional and code cannot be sent.
import { HttpError } from './errors.js'

export const BOAT_TYPES = ['single', 'double', 'paddleboard']

const rules = {
  code: (v) => (typeof v === 'string' && /^[A-Z]{2}-\d{2}$/.test(v)) || 'must look like TW-09',
  name: (v) => (typeof v === 'string' && v.trim().length > 0 && v.length <= 40) || 'must be 1 to 40 characters',
  type: (v) => BOAT_TYPES.includes(v) || `must be one of ${BOAT_TYPES.join(', ')}`,
  hourlyCents: (v) => (Number.isInteger(v) && v >= 100 && v <= 100_000) || 'must be a whole number of cents from 100 to 100000',
  available: (v) => typeof v === 'boolean' || 'must be true or false'
}

export function validateBoat(input, { partial = false } = {}) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new HttpError(400, 'validation_failed', 'The body must be a JSON object', [
      { field: 'body', message: 'must be an object' }
    ])
  }
  const boat = {}
  const details = []
  for (const [field, rule] of Object.entries(rules)) {
    if (input[field] === undefined) {
      if (!partial && field !== 'available') details.push({ field, message: 'is required' })
      continue
    }
    if (partial && field === 'code') {
      details.push({ field, message: 'cannot be changed' })
      continue
    }
    const verdict = rule(input[field])
    if (verdict === true) boat[field] = input[field]
    else details.push({ field, message: verdict })
  }
  if (details.length > 0) {
    throw new HttpError(400, 'validation_failed', 'Some fields are not valid', details)
  }
  if (!partial) boat.available ??= true
  return boat
}
