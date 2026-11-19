// Task: Keep the fleet in memory
//
// createBoatStore(seed) keeps boats in a Map keyed by code, starting with a copy of `seed`.
// It returns { list, get, create, update, remove }:
// - list() returns every boat, in the order they were added
// - get(code) returns the boat, or undefined
// - create(boat) adds it and returns it; a code that already exists throws
//   new HttpError(409, 'conflict', message)
// - update(code, changes) merges changes into the boat and returns it (the code never changes),
//   or returns undefined when there is no such boat
// - remove(code) deletes the boat and returns true, or returns false when there is none
// Boats go in and come out as copies, so changing an object outside never changes the store.
import { HttpError } from './errors.js'

export function createBoatStore(seed = []) {
  throw new Error('Not implemented')
}
