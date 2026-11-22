// Task 2: make the order search treat the customer's text as text (ticket AP-12).
//
// searchOrders(db, customerId, text) returns one customer's orders whose title contains text,
// ignoring case, as [{ id, title, status }] sorted by id. customerId comes from the signed-in
// session; text is whatever the customer typed in the search box.
// Keep the function name, its arguments and the shape it returns.

export function searchOrders(db, customerId, text) {
  const sql = `SELECT id, title, status FROM orders
    WHERE customer_id = ? AND title LIKE ?
    ORDER BY id`
  return db.prepare(sql).all(customerId, `%${text}%`)
}
