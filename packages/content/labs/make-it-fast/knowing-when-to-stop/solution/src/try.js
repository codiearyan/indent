// Tonight's report measured again, then put beside Sefton's first version.
// Run: node src/try.js   or with another number of orders: node src/try.js 60000
import { timeSteps } from './measure.js'
import * as old from './old-report.js'
import * as report from './report.js'
import { makePayments, makePriceOf, makeShop, PRICE_LIST } from './shop.js'

const shop = makeShop(Number(process.argv[2] ?? 30000))
const priceOf = makePriceOf()
const from = `${shop.date.slice(0, 8)}01`
console.log(`${shop.orders.length} orders, ${shop.customers.length} customers\n`)

let matched, trade, priced, ranking, days
const steps = {
  match() {
    matched = report.matchOrders(shop.orders, shop.customers)
    trade = report.tradeOrders(matched, shop.tradeIds)
    priced = report.priceOrders(matched, priceOf)
  },
  money() {
    ranking = report.addShares(report.rankCustomers(report.totalsByCustomer(priced), report.bySpend))
    days = report.takingsByDay(priced, from, shop.date)
  },
  print() {
    report.printReport({ date: shop.date, priced, ranking, days, payments: [] })
  }
}
console.log('The three steps, measured again:')
for (const { name, ms } of await timeSteps(steps)) console.log(`  ${name.padEnd(6)} ${ms.toFixed(1)} ms`)

// Idris's October: the days from the first to the last of the month.
const october = (from) => from.takingsByDay(from.priceOrders(from.matchOrders(shop.orders, shop.customers), makePriceOf()), '2026-10-01', '2026-10-31')
const last = (list) => list.at(-1)?.day ?? 'no days'
console.log(`\nOctober by day: Sefton's first version ends on ${last(october(old))}, yours on ${last(october(report))}`)

// Two reports from the same program, the second after Idris raised the price of calendars.
const dearer = PRICE_LIST.map((row) => (row.item === 'calendar' ? { ...row, retail: row.retail + 50, trade: row.trade + 50 } : row))
const small = makeShop(5000)
for (const [when, list] of [['before the change', PRICE_LIST], ['after the change', dearer]]) {
  const services = () => ({ priceOf: makePriceOf(list), ask: makePayments(small).ask })
  const mine = await report.buildReport(small, services())
  const first = await old.buildReport(small, services())
  console.log(`report ${when}: ${mine === first ? 'the same as Sefton\'s first version' : 'NOT the same as Sefton\'s first version'}`)
}
