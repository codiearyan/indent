// Ashgrove Press's nightly orders report. This is the copy you make fast, one cause at a
// time. src/old-report.js keeps Sefton's first version beside it, so the two can be compared.
//
// This issue:
// Task 1: printReport (with money) gives the same text with one money formatter.
// Task 2: takingsByDay stops at the first order after `until` and keeps the last day.
// Task 3: buildReport gives exactly the old report, also after the price list changed.
import { PAYMENTS_LIMIT } from './shop.js'
import { askLimited } from './together.js'

// Each order with its customer's record beside it.
export function matchOrders(orders, customers) {
  const byId = new Map(customers.map((customer) => [customer.id, customer]))
  return orders.map((order) => ({ ...order, customer: byId.get(order.customerId) }))
}

// The orders of trade customers, who get an invoice instead of paying at once.
export function tradeOrders(orders, tradeIds) {
  const trade = new Set(tradeIds)
  return orders.filter((order) => trade.has(order.customerId))
}

// Each order with its value in pence, from the price list.
export function priceOrders(orders, priceOf) {
  const prices = new Map()
  return orders.map((order) => {
    const key = `${order.item} ${order.customer.trade}`
    if (!prices.has(key)) prices.set(key, priceOf(order.item, order.customer.trade))
    return { ...order, pence: order.qty * prices.get(key) }
  })
}

// One row per customer: how many orders and how much they spent.
export function totalsByCustomer(orders) {
  const rows = new Map()
  for (const order of orders) {
    const row = rows.get(order.customerId) ?? {
      id: order.customerId,
      name: order.customer.name,
      orders: 0,
      spent: 0
    }
    row.orders += 1
    row.spent += order.pence
    rows.set(order.customerId, row)
  }
  return [...rows.values()]
}

// Biggest spender first; the same spend by name, then by id.
export function bySpend(a, b) {
  if (a.spent !== b.spent) return b.spent - a.spent
  if (a.name !== b.name) return a.name < b.name ? -1 : 1
  if (a.id !== b.id) return a.id < b.id ? -1 : 1
  return 0
}

// The customers in order of `compare`.
export function rankCustomers(rows, compare) {
  return [...rows].sort(compare)
}

// Each row with its share of the takings, from 0 to 1.
export function addShares(ranking) {
  const takings = ranking.reduce((sum, row) => sum + row.spent, 0)
  return ranking.map((row) => ({ ...row, share: row.spent / takings }))
}

// One line per day with orders, from the day `from` up to and including the day `until`.
// The orders are in day order, so the first order after `until` ends the list.
export function takingsByDay(orders, from, until) {
  const days = []
  let current
  for (const order of orders) {
    if (order.day > until) break
    if (order.day < from) continue
    if (current?.day !== order.day) {
      current = { day: order.day, orders: 0, pence: 0 }
      days.push(current)
    }
    current.orders += 1
    current.pence += order.pence
  }
  return days
}

// Each trade order's payment: 'paid', 'due' or 'late'. The payments service is asked only
// about the orders not already marked paid, never more than it takes at once.
export async function checkPayments(trade, ask) {
  const unpaid = trade.filter((order) => !order.paid)
  const answers = await askLimited(unpaid.map((order) => order.id), ask, PAYMENTS_LIMIT)
  const statusOf = new Map(unpaid.map((order, i) => [order.id, answers[i]]))
  return trade.map((order) => ({
    id: order.id,
    customerId: order.customerId,
    status: order.paid ? 'paid' : statusOf.get(order.id)
  }))
}

// An amount in pence, written as pounds: 123456 becomes £1,234.56.
const pounds = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })

export function money(pence) {
  return pounds.format(pence / 100)
}

// The report as text.
export function printReport({ date, priced, ranking, days, payments }) {
  const takings = priced.reduce((sum, order) => sum + order.pence, 0)
  let text = `Ashgrove Press, orders report for ${date}\n`
  text += `Orders: ${priced.length}   Takings: ${money(takings)}\n`
  text += '\nCustomers by spend\n'
  ranking.forEach((row, i) => {
    const share = (row.share * 100).toFixed(2)
    text += `${String(i + 1).padStart(6)}  ${row.name} (${row.id})  ${row.orders} orders  ${money(row.spent)}  ${share}%\n`
  })
  text += '\nTakings by day this month\n'
  for (const day of days) {
    text += `  ${day.day}  ${day.orders} orders  ${money(day.pence)}\n`
  }
  text += '\nTrade invoices not paid yet\n'
  const unpaid = payments.filter((payment) => payment.status !== 'paid')
  for (const payment of unpaid) {
    text += `  ${payment.id}  ${payment.customerId}  ${payment.status}\n`
  }
  if (unpaid.length === 0) text += '  none\n'
  return text
}

// The whole report: match, money, payments, print.
export async function buildReport(shop, { priceOf, ask }) {
  const matched = matchOrders(shop.orders, shop.customers)
  const trade = tradeOrders(matched, shop.tradeIds)
  const priced = priceOrders(matched, priceOf)
  const ranking = addShares(rankCustomers(totalsByCustomer(priced), bySpend))
  const days = takingsByDay(priced, `${shop.date.slice(0, 8)}01`, shop.date)
  const payments = await checkPayments(trade, ask)
  return printReport({ date: shop.date, priced, ranking, days, payments })
}
