// Making decisions. Run this file with: node src/decisions.js
//
// Task 1: Warn when stock runs low
// Task 2: Price the shipping
// Task 3: One candle or many
// Task 4: Say when it ships

// Today's order and the shop's numbers. Check tries other orders here, so build on these names,
// not on the values themselves.
const totalCents = 4200
const deliveryZone = 'national' // 'local', 'national' or 'abroad'
const candlesInStock = 2
const quantity = 3
const hourNow = 11 // the hour on the shop clock, from 0 to 23

console.log('Order total in cents:', totalCents)

// Task 1: Warn when stock runs low
let stockNote
if (candlesInStock < 5) {
  stockNote = 'Running low'
} else {
  stockNote = 'Plenty on the shelf'
}
console.log(stockNote)

// Task 2: Price the shipping
let shippingCents
if (totalCents >= 5000) {
  shippingCents = 0
} else if (deliveryZone === 'local') {
  shippingCents = 250
} else if (deliveryZone === 'national') {
  shippingCents = 495
} else {
  shippingCents = 1295
}
console.log('Shipping in cents:', shippingCents)

// Task 3: One candle or many
const candleWord = quantity === 1 ? 'candle' : 'candles'
console.log(quantity, candleWord)

// Task 4: Say when it ships
let shipsWhen
if (candlesInStock < quantity) {
  shipsWhen = 'When restocked'
} else if (hourNow < 14) {
  shipsWhen = 'Today'
} else {
  shipsWhen = 'Tomorrow'
}
console.log('Ships:', shipsWhen)
