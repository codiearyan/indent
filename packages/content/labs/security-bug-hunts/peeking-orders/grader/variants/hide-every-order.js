export function getOrder() {
  return null
}

export function listOrders(db, session) {
  return db
    .prepare('SELECT id, title, status FROM orders WHERE customer_id = ? ORDER BY id')
    .all(session.customerId)
    .map((row) => ({ ...row }))
}
