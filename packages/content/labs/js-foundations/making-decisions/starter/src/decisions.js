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
// Make a let called stockNote. With an if and an else, give it the text Running low when there
// are fewer than 5 candles in stock, and the text Plenty on the shelf otherwise. Print it.

// Task 2: Price the shipping
// Make a let called shippingCents and give it one value with if, else if and else:
// - an order of 5000 cents or more ships free (0), wherever it goes
// - otherwise, local delivery costs 250
// - otherwise, national delivery costs 495
// - otherwise, it costs 1295
// Print it.

// Task 3: One candle or many
// Make a const called candleWord with the short form, ? and :. It is the text candle when the
// quantity is exactly 1, and candles for any other quantity. Print it.

// Task 4: Say when it ships
// Make a let called shipsWhen:
// - When restocked, if there are fewer candles in stock than the order needs
// - otherwise Today, if the shop clock shows an hour before 14
// - otherwise Tomorrow
// Print it.
