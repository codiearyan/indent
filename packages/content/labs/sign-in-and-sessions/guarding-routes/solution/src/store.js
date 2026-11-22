// Written for you: the workshops live in memory while the server runs, and start again from the
// seed when it restarts. Every method hands out copies, so changing a returned object never
// changes what is stored. Ids are numbers, and the store picks the next one itself.
export function createStore(seed = []) {
  const items = new Map(seed.map((workshop) => [workshop.id, { ...workshop }]))
  let nextId = Math.max(0, ...items.keys()) + 1

  return {
    list() {
      return [...items.values()].map((workshop) => ({ ...workshop }))
    },
    get(id) {
      const workshop = items.get(id)
      return workshop && { ...workshop }
    },
    create(fields) {
      const workshop = { ...fields, id: nextId++ }
      items.set(workshop.id, workshop)
      return { ...workshop }
    },
    update(id, fields) {
      if (!items.has(id)) return undefined
      const workshop = { ...items.get(id), ...fields, id }
      items.set(id, workshop)
      return { ...workshop }
    },
    remove(id) {
      return items.delete(id)
    }
  }
}
