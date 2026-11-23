// The payments part of tonight's report, Sefton's way and yours. Run: node src/try.js
// The stand-in service answers in about a millisecond; the real one takes about four seconds.
import * as old from './old-report.js'
import { checkPayments, matchOrders, tradeOrders } from './report.js'
import { makePayments, makeShop, PAYMENTS_LIMIT } from './shop.js'
import { askAll, askLimited } from './together.js'

const shop = makeShop(Number(process.argv[2] ?? 30000))
const trade = tradeOrders(matchOrders(shop.orders, shop.customers), shop.tradeIds)
const unpaid = trade.filter((order) => !order.paid)
console.log(`${trade.length} trade orders, ${unpaid.length} of them not marked paid\n`)

async function run(name, work) {
  const payments = makePayments(shop)
  const start = performance.now()
  try {
    const answers = await work(payments.ask)
    const minutes = (payments.asked * 4) / Math.max(1, payments.mostOpen) / 60
    console.log(`${name}`)
    console.log(`  ${payments.asked} questions, at most ${payments.mostOpen} at once, ${(performance.now() - start).toFixed(0)} ms here`)
    console.log(`  about ${minutes.toFixed(1)} minutes with the real service${payments.mostOpen > PAYMENTS_LIMIT ? ', which refuses more than ' + PAYMENTS_LIMIT + ' at once' : ''}`)
    return answers
  } catch (error) {
    console.log(`${name}\n  ${error.message}`)
  }
}

const ten = unpaid.slice(0, 10).map((order) => order.id)
await run('askAll on 10 orders', (ask) => askAll(ten, ask))
await run(`askLimited on 10 orders, ${PAYMENTS_LIMIT} at once`, (ask) => askLimited(ten, ask, PAYMENTS_LIMIT))
const before = await run('old checkPayments', (ask) => old.checkPayments(trade, ask))
const after = await run('checkPayments', (ask) => checkPayments(trade, ask))
if (before && after) {
  console.log(JSON.stringify(before) === JSON.stringify(after) ? '\nthe same answer as before' : '\nNOT the same answer as before')
}
