// The machines the shop waits on. Each one gives back a promise. You do not need to change this file.

const shelves = { Cedar: 4, Fig: 0, Sage: 9, Amber: 2, Moss: 6 }
const deliveries = { Cedar: 'Thursday', Fig: 'Friday', Sage: 'Monday', Amber: 'Thursday', Moss: 'Friday' }

const later = (answer) => new Promise((resolve) => setTimeout(() => resolve(answer()), 200))

// The card machine. chargeCard(totalCents) gives back a promise of a receipt, an object like
// { approved: true, code: 'A-118' }.
let receipts = 117
export function chargeCard(totalCents) {
  return later(() => ({ approved: true, code: `A-${(receipts += 1)}` }))
}

// The stock room computer, wrapped in a promise as you did in the last issue. countStock(name)
// gives back a promise of the count of the candle called name.
export function countStock(name) {
  return later(() => shelves[name] ?? 0)
}

// The wax supplier. orderCandles(name, count) gives back a promise of the delivery, an object like
// { name: 'Cedar', count: 6, arrives: 'Thursday' }.
export function orderCandles(name, count) {
  return later(() => ({ name, count, arrives: deliveries[name] ?? 'next week' }))
}

// The stock room again. takeFromStock(name, count) takes count candles off the shelf and gives
// back a promise of how many are left.
export function takeFromStock(name, count) {
  return later(() => {
    shelves[name] = (shelves[name] ?? 0) - count
    return shelves[name]
  })
}
