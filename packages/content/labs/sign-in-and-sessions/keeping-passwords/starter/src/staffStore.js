// Written for you: the studio's staff accounts live in memory while the server runs. Every method
// hands out copies, so changing a returned object never changes what is stored. The store picks
// each id itself, and finds an email whatever its case or the spaces around it.
export function createStaffStore() {
  const people = new Map()
  let nextId = 1
  const sameEmail = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase()

  return {
    add(fields) {
      const member = { ...fields, id: nextId++ }
      people.set(member.id, member)
      return { ...member }
    },
    get(id) {
      const member = people.get(id)
      return member && { ...member }
    },
    findByEmail(email) {
      const member = [...people.values()].find((m) => sameEmail(m.email, email))
      return member && { ...member }
    },
    list() {
      return [...people.values()].map((member) => ({ ...member }))
    }
  }
}
