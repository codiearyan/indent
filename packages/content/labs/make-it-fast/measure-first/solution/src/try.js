// Measures tonight's report before anything changes. Run: node src/try.js
// Add a number of orders to try another size: node src/try.js 60000
import { counted, timeIt, timeSteps } from './measure.js'
import {
  addShares,
  bySpend,
  checkPayments,
  matchOrders,
  priceOrders,
  printReport,
  rankCustomers,
  takingsByDay,
  totalsByCustomer,
  tradeOrders
} from './report.js'
import { makePriceOf, makeShop } from './shop.js'

const shop = makeShop(Number(process.argv[2] ?? 30000))
const priceOf = makePriceOf()
const from = `${shop.date.slice(0, 8)}01`
console.log(`${shop.orders.length} orders, ${shop.customers.length} customers\n`)

// The report's three steps of work. Each keeps what it made for the next one.
let matched, trade, priced, ranking, days
const steps = {
  match() {
    matched = matchOrders(shop.orders, shop.customers)
    trade = tradeOrders(matched, shop.tradeIds)
    priced = priceOrders(matched, priceOf)
  },
  money() {
    ranking = addShares(rankCustomers(totalsByCustomer(priced), bySpend))
    days = takingsByDay(priced, from, shop.date)
  },
  print() {
    printReport({ date: shop.date, priced, ranking, days, payments: [] })
  }
}

async function show(title, work) {
  try {
    console.log(`${title}\n${await work()}\n`)
  } catch (error) {
    console.log(`${title}\n  ${error.message}\n`)
  }
}

await show('Task 1, timeIt on the match step:', async () => `  ${(await timeIt(steps.match)).toFixed(1)} ms`)

await show('Task 2, timeSteps on all three steps:', async () => {
  steps.match()
  steps.money()
  const timed = await timeSteps(steps)
  return timed.map(({ name, ms }) => `  ${name.padEnd(6)} ${ms.toFixed(1)} ms`).join('\n')
})

await show('Task 3, the work counted:', async () => {
  steps.match()
  const compare = counted(bySpend)
  rankCustomers(totalsByCustomer(priced), compare)
  const price = counted(priceOf)
  priceOrders(matched, price)
  const ask = counted(async () => 'paid')
  await checkPayments(trade, ask)
  const hours = (ask.calls * 4) / 3600
  return [
    `  comparisons while ranking: ${compare.calls}`,
    `  price questions: ${price.calls}`,
    `  payment questions: ${ask.calls}, about ${hours.toFixed(1)} hours at four seconds each`
  ].join('\n')
})
