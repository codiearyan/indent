// Copied into the sandbox as .grader/drive.mjs. Opens orders with the learner's getOrder().
import { openDb } from '../src/db.js'
import { getOrder } from '../src/orders.js'

export function open(cases) {
  const db = openDb()
  return cases.map(([session, orderId]) => {
    try {
      const order = getOrder(db, session, orderId)
      return { order: order === undefined ? 'undefined' : order }
    } catch (err) {
      return { error: `${err.name}: ${err.message}` }
    }
  })
}
