// Run with: node src/demo.js
import { orders } from './orders.js'
import { orderTotal } from './orderTotal.js'
import { topCandles } from './topCandles.js'
import { revenueByDay } from './revenueByDay.js'

function show(label, run) {
  try {
    console.log(label, JSON.stringify(run()))
  } catch (err) {
    console.log(label, `Error: ${err.message}`)
  }
}

show('orderTotal(WC-1001):', () => orderTotal(orders[0]))
show('orderTotal(WC-1002):', () => orderTotal(orders[1]))
show('topCandles(orders, 2):', () => topCandles(orders, 2))
show('revenueByDay(orders):', () => revenueByDay(orders))
