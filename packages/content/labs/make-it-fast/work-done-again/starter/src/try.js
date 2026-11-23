// Sefton's money step beside yours: the same answer, the work counted, and the time.
// Run: node src/try.js   or with another number of orders: node src/try.js 60000
import { counted, timeIt } from './measure.js'
import * as old from './old-report.js'
import { addShares, bySpend, matchOrders, priceOrders, rankCustomers, totalsByCustomer } from './report.js'
import { makePriceOf, makeShop } from './shop.js'

const shop = makeShop(Number(process.argv[2] ?? 30000))
const priceOf = makePriceOf()
const matched = matchOrders(shop.orders, shop.customers)
const priced = old.priceOrders(matched, priceOf)
const rows = totalsByCustomer(priced)
const ranked = old.rankCustomers(rows, bySpend)
console.log(`${shop.orders.length} orders, ${rows.length} customers with orders\n`)

const same = (a, b) => (JSON.stringify(a) === JSON.stringify(b) ? 'the same answer as before' : 'NOT the same answer as before')
const tasks = [
  ['addShares', () => old.addShares(ranked), () => addShares(ranked)],
  ['rankCustomers', () => old.rankCustomers(rows, bySpend), () => rankCustomers(rows, bySpend)],
  ['priceOrders', () => old.priceOrders(matched, priceOf), () => priceOrders(matched, priceOf)]
]
for (const [name, before, after] of tasks) console.log(`${name}: ${same(before(), after())}`)

const compareOld = counted(bySpend)
const compareNew = counted(bySpend)
old.rankCustomers(rows, compareOld)
rankCustomers(rows, compareNew)
const askOld = counted(priceOf)
const askNew = counted(priceOf)
old.priceOrders(matched, askOld)
priceOrders(matched, askNew)
console.log('\nThe work, counted (old, then yours):')
console.log(`  comparisons while ranking: ${compareOld.calls}, ${compareNew.calls}`)
console.log(`  price questions: ${askOld.calls}, ${askNew.calls}`)

console.log('\nTime, the middle of five runs (old, then yours):')
for (const [name, before, after] of tasks) {
  console.log(`  ${name.padEnd(14)} ${(await timeIt(before)).toFixed(1)} ms, ${(await timeIt(after)).toFixed(1)} ms`)
}

// Two ways to build a long text. Measure before you believe either one is faster.
const lines = rows.map((row) => `${row.id}  ${row.name}  ${row.spent}`)
const adding = () => {
  let text = ''
  for (const line of lines) text += `${line}\n`
  return text
}
const joining = () => `${lines.join('\n')}\n`
console.log(`\nA text of ${lines.length} lines, built by adding: ${(await timeIt(adding)).toFixed(2)} ms, by joining: ${(await timeIt(joining)).toFixed(2)} ms`)
