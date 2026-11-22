export function getOrder(db, session, orderId) {
  const row = db
    .prepare(
      'SELECT id, title, status, note, ship_to AS shipTo, total, customer_id FROM orders WHERE id = ?'
    )
    .get(orderId)
  if (!row) return null
  if (row.customer_id !== session.customerId) {
    throw new Error(`Order ${orderId} belongs to another customer`)
  }
  const { customer_id, ...order } = row
  return order
}

export function listOrders(db, session) {
  return db
    .prepare('SELECT id, title, status FROM orders WHERE customer_id = ? ORDER BY id')
    .all(session.customerId)
    .map((row) => ({ ...row }))
}
