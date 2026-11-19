// Task: Find the best sellers
//
// Count the units sold per sku across `orders`, skipping orders whose status is 'cancelled'.
// Return an array of { sku, units } for the `n` skus with the most units:
// - most units first
// - when two skus sold the same number of units, the one that comes first alphabetically wins
// - if fewer than `n` skus were sold, return all of them
export function topTeas(orders, n) {
  const units = new Map()
  for (const order of orders.filter((o) => o.status !== 'cancelled')) {
    for (const { sku, qty } of order.items) units.set(sku, (units.get(sku) ?? 0) + qty)
  }
  return [...units]
    .map(([sku, count]) => ({ sku, units: count }))
    .sort((a, b) => b.units - a.units || (a.sku < b.sku ? -1 : 1))
    .slice(0, n)
}
