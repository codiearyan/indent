// Task: Total one order
//
// Return the total of `order` in cents:
// - add up qty * priceCents for every entry in order.items
// - subtract order.discountCents when the order has one
// - the total never goes below 0
// An order with no items totals 0.
export function orderTotal(order) {
  const subtotal = order.items.reduce((sum, item) => sum + item.qty * item.priceCents, 0)
  return Math.max(0, subtotal - (order.discountCents ?? 0))
}
