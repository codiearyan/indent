// Task: A request id on every response
//
// requestIdFor(req) returns the id for this request:
// - the incoming x-request-id header when it is 1 to 64 characters of letters, digits, '.', '_' or '-'
// - otherwise a new id from randomUUID()
// createApp sets it as the x-request-id header of every response before anything else runs.
import { randomUUID } from 'node:crypto'

export function requestIdFor(req) {
  throw new Error('Not implemented')
}
