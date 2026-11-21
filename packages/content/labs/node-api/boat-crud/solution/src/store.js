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
  const boats = new Map(seed.map((boat) => [boat.code, { ...boat }]))
  return {
    list: () => [...boats.values()].map((boat) => ({ ...boat })),
    get(code) {
      const boat = boats.get(code)
      return boat && { ...boat }
    },
    create(boat) {
      if (boats.has(boat.code)) {
        throw new HttpError(409, 'conflict', `A boat with code ${boat.code} already exists`)
      }
      boats.set(boat.code, { ...boat })
      return { ...boat }
    },
    update(code, changes) {
      const boat = boats.get(code)
      if (!boat) return undefined
      const updated = { ...boat, ...changes, code }
      boats.set(code, updated)
      return { ...updated }
    },
    remove: (code) => boats.delete(code)
  }
}
