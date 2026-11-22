export function searchOrders(db, customerId, text) {
  const clean = text.replaceAll("'", '')
  const sql = `SELECT id, title, status FROM orders
    WHERE customer_id = ${customerId} AND title LIKE '%${clean}%'
    ORDER BY id`
  return db.prepare(sql).all()
}
