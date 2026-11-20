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
  throw new Error('Not implemented')
}

// Task 2: Find the best sellers
//
// Count the units sold per sku across `orders`, skipping orders whose status is 'cancelled'.
// Return an array of { sku, units } for the `n` skus with the most units:
// - most units first
// - when two skus sold the same number of units, the one that comes first alphabetically wins
// - if fewer than `n` skus were sold, return all of them
export function topCandles(orders, n) {
  throw new Error('Not implemented')
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
  throw new Error('Not implemented')
}
