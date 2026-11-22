// Tasks: List the workshops from the table, Read one workshop by its id, Filter in the query
//
// createStore(db) gives the routes the same methods the store in memory had, but every one now
// asks the database. A workshop comes back as { id, title, day, seats, priceCents }.
// - list(filters) returns the workshops in id order. filters may hold day and maxPriceCents;
//   one that is undefined is not used
// - get(id) returns the workshop with that id, or undefined when there is none
// Every value reaches the database in the place of a ?, never inside the SQL text.
export function createStore(db) {
  function list({ day, maxPriceCents } = {}) {
    throw new Error('Not implemented')
  }

  function get(id) {
    throw new Error('Not implemented')
  }

  // Changing workshops comes in the next issue.
  function notYet() {
    throw new Error('Changing workshops comes in the next issue')
  }

  return { list, get, create: notYet, update: notYet, remove: notYet }
}
