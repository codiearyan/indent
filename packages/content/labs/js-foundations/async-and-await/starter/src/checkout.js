// Top to bottom with await. Run the demo with: node src/demo.js
//
// Task 1: Wait with await
// Task 2: Always a promise
// Task 3: Count, then decide
// Task 4: Close a sale
//
// chargeCard, countStock, orderCandles and takeFromStock come from src/shop.js. Each gives back a
// promise; read there what each one is a promise of.
//
// An order looks like this: { id: 'WC-3001', candle: 'Cedar', qty: 1, totalCents: 1800 }
import { chargeCard, countStock, orderCandles, takeFromStock } from './shop.js'

// Task 1: Wait with await
// paidLine(order) charges order.totalCents on the card machine and gives back a promise of one
// line: the order id, then ' paid, code ' and the code on the receipt, like 'WC-3001 paid, code A-118'.
export function paidLine(order) {
  throw new Error('Not implemented')
}

// Task 2: Always a promise
// stockFor(name, noted) gives back a promise of the count of the candle called name. noted is an
// object of counts Theo wrote down today, like { Fig: 0, Sage: 9 }. When name is in noted, the
// count comes from there and the stock room is not asked. Otherwise it comes from countStock.
export function stockFor(name, noted) {
  throw new Error('Not implemented')
}

// Task 3: Count, then decide
// reorder(name, target) counts the candle called name. When there are at least target, it gives
// back a promise of 'Cedar: enough in stock' for Cedar. Otherwise it orders as many as are
// missing, target minus the count, with orderCandles, and gives back a promise of a line made from
// the delivery: 'Cedar: 6 ordered, arrives Thursday'.
export function reorder(name, target) {
  throw new Error('Not implemented')
}

// Task 4: Close a sale
// closeSale(order) charges the order, with paidLine from Task 1 for example, and once it is paid,
// and not before, takes order.qty candles of order.candle from stock with takeFromStock. It gives back a
// promise of a list of two lines: the line from paidLine, and 'Sage: 7 left' for 7 sage candles left.
export function closeSale(order) {
  throw new Error('Not implemented')
}
