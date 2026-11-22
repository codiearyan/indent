// Tasks: Refuse a booking when the workshop is full, Book a group, all or none, Undo a group
//        that fails halfway
//
// createStore(db) gives the routes their workshops and bookings from the database. Every value
// reaches the database in the place of a ?.
// - book(workshopId, name) returns { problem: 'full' } and adds nothing when no place is left
// - bookGroup(workshopId, names) books every name, or none: it returns
//   { bookings: [{ id, workshopId, name }, ...] }, { problem: 'not_found' } or
//   { problem: 'full' } when there are not enough places left for all of them. When the database
//   fails halfway, no booking of the group stays and the error goes on to the error handler
// - list, get, create, update and remove are yours from the last issues
// Each workshop with its places left: a row for every workshop, bookings or not, counted per
// workshop.
const WORKSHOPS = `
  SELECT w.id, w.title, w.day, w.seats, w.priceCents, w.seats - COUNT(b.id) AS placesLeft
  FROM workshops AS w
  LEFT JOIN bookings AS b ON b.workshopId = w.id`

export function createStore(db) {
  function list({ day, maxPriceCents } = {}) {
    const conditions = []
    const values = []
    if (day !== undefined) {
      conditions.push('w.day = ?')
      values.push(day)
    }
    if (maxPriceCents !== undefined) {
      conditions.push('w.priceCents <= ?')
      values.push(maxPriceCents)
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    return db.prepare(`${WORKSHOPS} ${where} GROUP BY w.id ORDER BY w.id`).all(...values)
  }

  function get(id) {
    return db.prepare(`${WORKSHOPS} WHERE w.id = ? GROUP BY w.id`).get(id)
  }

  function create(fields) {
    const { lastInsertRowid } = db
      .prepare('INSERT INTO workshops (title, day, seats, priceCents) VALUES (?, ?, ?, ?)')
      .run(fields.title, fields.day, fields.seats, fields.priceCents)
    return get(lastInsertRowid)
  }

  function update(id, fields) {
    const { changes } = db
      .prepare(
        `UPDATE workshops
         SET title = COALESCE(?, title), day = COALESCE(?, day),
             seats = COALESCE(?, seats), priceCents = COALESCE(?, priceCents)
         WHERE id = ?`
      )
      .run(
        fields.title ?? null,
        fields.day ?? null,
        fields.seats ?? null,
        fields.priceCents ?? null,
        id
      )
    return changes === 0 ? undefined : get(id)
  }

  function remove(id) {
    return db.prepare('DELETE FROM workshops WHERE id = ?').run(id).changes > 0
  }

  function book(workshopId, name) {
    if (!get(workshopId)) return { problem: 'not_found' }
    const { lastInsertRowid } = db
      .prepare('INSERT INTO bookings (workshopId, name) VALUES (?, ?)')
      .run(workshopId, name)
    return { booking: { id: lastInsertRowid, workshopId, name } }
  }

  function bookGroup(workshopId, names) {
    throw new Error('Not implemented')
  }

  return { list, get, create, update, remove, book, bookGroup }
}
