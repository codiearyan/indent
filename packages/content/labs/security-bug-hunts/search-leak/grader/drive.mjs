// Copied into the sandbox as .grader/drive.mjs. Runs the learner's searchOrders() on a database
// that remembers every piece of SQL it was handed.
import { openDb } from '../src/db.js'
import { searchOrders } from '../src/search.js'

function watch(db, seen) {
  return new Proxy(db, {
    get(target, key) {
      if (key === 'prepare' || key === 'exec') {
        return (sql, ...rest) => {
          seen.push(String(sql))
          return target[key](sql, ...rest)
        }
      }
      const value = target[key]
      return typeof value === 'function' ? value.bind(target) : value
    }
  })
}

export function search(cases) {
  const db = openDb()
  return cases.map(([customerId, text]) => {
    const sql = []
    try {
      return { rows: searchOrders(watch(db, sql), customerId, text), sql }
    } catch (err) {
      return { error: `${err.name}: ${err.message}`, sql }
    }
  })
}
