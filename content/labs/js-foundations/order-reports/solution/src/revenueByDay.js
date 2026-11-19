// Task: Revenue per day
//
// Return an object that maps each day to the revenue of that day in cents, for example
// { '2026-11-02': 3200, '2026-11-03': 3800 }.
// - only orders with status 'paid' count
// - the day is the date part of placedAt (the first 10 characters, YYYY-MM-DD)
// - an order's revenue is its total, discount included (you may use orderTotal)
// - days without paid orders do not appear
import { orderTotal } from './orderTotal.js'

export function revenueByDay(orders) {
  const days = {}
  for (const order of orders) {
    if (order.status !== 'paid') continue
    const day = order.placedAt.slice(0, 10)
    days[day] = (days[day] ?? 0) + orderTotal(order)
  }
  return days
}
