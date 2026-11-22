// Tasks: Add a workshop, Change a workshop, Remove a workshop
//
// createStore(db) gives the routes their workshops from the database. A workshop comes back as
// { id, title, day, seats, priceCents }. Every value reaches the database in the place of a ?.
// - list(filters) and get(id) read workshops, as in the last issue
// - create(fields) adds a workshop from { title, day, seats, priceCents } and returns it with the
//   id the database gave it
// - update(id, fields) changes only the fields it is given and returns the whole workshop, or
//   undefined when no row has that id
// - remove(id) deletes the workshop and returns true, or false when no row had that id
const COLUMNS = 'id, title, day, seats, priceCents'

export function createStore(db) {
  function list({ day, maxPriceCents } = {}) {
    const conditions = []
    const values = []
    if (day !== undefined) {
      conditions.push('day = ?')
      values.push(day)
    }
    if (maxPriceCents !== undefined) {
      conditions.push('priceCents <= ?')
      values.push(maxPriceCents)
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    return db.prepare(`SELECT ${COLUMNS} FROM workshops ${where} ORDER BY id`).all(...values)
  }

  function get(id) {
    return db.prepare(`SELECT ${COLUMNS} FROM workshops WHERE id = ?`).get(id)
  }

  function create(fields) {
    throw new Error('Not implemented')
  }

  function update(id, fields) {
    throw new Error('Not implemented')
  }

  function remove(id) {
    throw new Error('Not implemented')
  }

  return { list, get, create, update, remove }
}
