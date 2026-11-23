// Ashgrove Press's nightly orders report. This is the copy you make fast, one cause at a
// time. src/old-report.js keeps Sefton's first version beside it, so the two can be compared.
//
// This issue (tasks 1 and 2 are in src/together.js):
// Task 3: checkPayments asks only about trade orders not marked paid, at most PAYMENTS_LIMIT
//         questions at once, and gives back the same list as before.
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
export function takingsByDay(orders, from, until) {
  const days = [...new Set(orders.map((order) => order.day))].filter((day) => day >= from && day <= until)
  return days.map((day) => {
    const ofDay = orders.filter((order) => order.day === day)
    return { day, orders: ofDay.length, pence: ofDay.reduce((sum, order) => sum + order.pence, 0) }
  })
}

// Asks the payments service about each trade order: 'paid', 'due' or 'late'.
export async function checkPayments(trade, ask) {
  const payments = []
  for (const order of trade) {
    const status = await ask(order.id)
    payments.push({ id: order.id, customerId: order.customerId, status })
  }
  return payments
}

// An amount in pence, written as pounds: 123456 becomes £1,234.56.
export function money(pence) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100)
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
