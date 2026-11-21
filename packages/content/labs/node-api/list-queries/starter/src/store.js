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
