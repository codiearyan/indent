// Task 2: show an order only to the customer it belongs to (ticket AP-19).
//
// getOrder(db, session, orderId) returns one order for the order page as
// { id, title, status, note, shipTo, total }, or null when there is no order to show.
// session is { customerId } for the signed-in customer. orderId comes from the link, such as
// /orders/2041, so the customer can change it to any number they like.
// listOrders(db, session) returns the customer's orders for their order list.
// Keep the function names, their arguments and the shapes they return.

export function getOrder(db, session, orderId) {
  const row = db
    .prepare(
      `SELECT id, title, status, note, ship_to AS shipTo, total FROM orders
       WHERE id = ? AND customer_id = ?`
    )
    .get(orderId, session.customerId)
  return row ? { ...row } : null
}

export function listOrders(db, session) {
  return db
    .prepare('SELECT id, title, status FROM orders WHERE customer_id = ? ORDER BY id')
    .all(session.customerId)
    .map((row) => ({ ...row }))
}
