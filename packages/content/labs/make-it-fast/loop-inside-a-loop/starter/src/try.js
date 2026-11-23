// Puts Sefton's matching beside yours: same answer, how long, and how the work grows.
// Run: node src/try.js   or with another number of orders: node src/try.js 60000
import { growth, timeIt } from './measure.js'
import * as old from './old-report.js'
import { matchOrders, tradeOrders } from './report.js'
import { makeShop } from './shop.js'

const shop = makeShop(Number(process.argv[2] ?? 30000))
console.log(`${shop.orders.length} orders, ${shop.customers.length} customers, ${shop.tradeIds.length} of them trade\n`)

function compare(name, before, after) {
  const a = JSON.stringify(before())
  const b = JSON.stringify(after())
  console.log(`${name}: ${a === b ? 'the same answer as before' : 'NOT the same answer as before'}`)
}

compare('matchOrders', () => old.matchOrders(shop.orders, shop.customers), () => matchOrders(shop.orders, shop.customers))
const matched = matchOrders(shop.orders, shop.customers)
compare('tradeOrders', () => old.tradeOrders(matched, shop.tradeIds), () => tradeOrders(matched, shop.tradeIds))

console.log('\nTime, the middle of five runs:')
for (const [name, fn] of [
  ['old matchOrders', () => old.matchOrders(shop.orders, shop.customers)],
  ['matchOrders', () => matchOrders(shop.orders, shop.customers)],
  ['old tradeOrders', () => old.tradeOrders(matched, shop.tradeIds)],
  ['tradeOrders', () => tradeOrders(matched, shop.tradeIds)]
]) {
  console.log(`  ${name.padEnd(16)} ${(await timeIt(fn)).toFixed(1)} ms`)
}

// The steps, counted: how many times a customer's id is read while matching a shop of n orders.
function idReads(match) {
  return (n) => {
    const small = makeShop(n)
    let reads = 0
    const customers = small.customers.map(
      (customer) =>
        new Proxy(customer, {
          get(target, key) {
            if (key === 'id') reads += 1
            return target[key]
          }
        })
    )
    match(small.orders, customers)
    return reads
  }
}

console.log('\nCustomer ids read, at 2000 and 4000 orders:')
for (const [name, match] of [['old matchOrders', old.matchOrders], ['matchOrders', matchOrders]]) {
  const count = idReads(match)
  let grows
  try {
    grows = growth(count, 2000)
  } catch (error) {
    grows = error.message
  }
  console.log(`  ${name.padEnd(16)} ${count(2000)} then ${count(4000)}: ${grows}`)
}
