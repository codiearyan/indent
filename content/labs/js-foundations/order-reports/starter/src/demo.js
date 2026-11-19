// Run with: node src/demo.js
import { orders } from './orders.js'
import { orderTotal } from './orderTotal.js'
import { topTeas } from './topTeas.js'
import { revenueByDay } from './revenueByDay.js'

function show(label, run) {
  try {
    console.log(label, JSON.stringify(run()))
  } catch (err) {
    console.log(label, `Error: ${err.message}`)
  }
}

show('orderTotal(LT-1001):', () => orderTotal(orders[0]))
show('orderTotal(LT-1002):', () => orderTotal(orders[1]))
show('topTeas(orders, 2):', () => topTeas(orders, 2))
show('revenueByDay(orders):', () => revenueByDay(orders))
