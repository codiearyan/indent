// Wickhollow's order reports. One function per task, in order.
//
// Every order looks like this one (all of last week's are in src/orders.js):
//
// {
//   id: 'WC-1002',
//   placedAt: '2026-11-02T17:40:00Z',
//   status: 'paid',          // 'paid', 'pending' or 'cancelled'
//   discountCents: 500,      // only some orders have a discount
//   items: [{ sku: 'sage', qty: 1, priceCents: 1800 }]
// }
//
// Prices are in cents, so 1800 means 18.00.

// Task 1: Total one order
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

// Task 2: Find the best sellers
//
// Count the units sold per sku across `orders`, skipping orders whose status is 'cancelled'.
// Return an array of { sku, units } for the `n` skus with the most units:
// - most units first
// - when two skus sold the same number of units, the one that comes first alphabetically wins
// - if fewer than `n` skus were sold, return all of them
export function topCandles(orders, n) {
  const units = new Map()
  for (const order of orders.filter((o) => o.status !== 'cancelled')) {
    for (const { sku, qty } of order.items) units.set(sku, (units.get(sku) ?? 0) + qty)
  }
  return [...units]
    .map(([sku, count]) => ({ sku, units: count }))
    .sort((a, b) => b.units - a.units || (a.sku < b.sku ? -1 : 1))
    .slice(0, n)
}

// Task 3: Revenue per day
//
// Return an object that maps each day to the revenue of that day in cents, for example
// { '2026-11-02': 3200, '2026-11-03': 3800 }.
// - only orders with status 'paid' count
// - the day is the date part of placedAt (the first 10 characters, YYYY-MM-DD)
// - an order's revenue is its total, discount included, so orderTotal from Task 1 helps
// - days without paid orders do not appear
export function revenueByDay(orders) {
  const days = {}
  for (const order of orders) {
    if (order.status !== 'paid') continue
    const day = order.placedAt.slice(0, 10)
    days[day] = (days[day] ?? 0) + orderTotal(order)
  }
  return days
}
