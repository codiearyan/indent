// Rules you can reuse. Run this file with: node src/functions.js
//
// Task 1: Write the candle label
// Task 2: Shipping for any order
// Task 3: Price with a default quantity
// Task 4: Put the order together
//
// Each task fills in one function below. The empty ones give back undefined until you do.

// Task 1: Write the candle label
// Give candleLabel two parameters, scent and grams, and return a label like: Cedar candle, 200 g
function candleLabel() {}

console.log(candleLabel('Cedar', 200))

// Task 2: Shipping for any order
// Give shippingFor two parameters, totalCents and zone, and return the shipping in cents:
// - 0 when totalCents is 5000 or more, wherever it goes
// - otherwise 250 for 'local', 495 for 'national' and 1295 for anywhere else
function shippingFor() {}

console.log(shippingFor(4200, 'national'))

// Task 3: Price with a default quantity
// Give priceFor two parameters, priceCents and quantity, and return priceCents times quantity.
// When priceFor is called without a quantity, it counts one candle.
function priceFor() {}

console.log(priceFor(1250, 3))
console.log(priceFor(1250))

// Task 4: Put the order together
// Give orderTotal three parameters, priceCents, quantity and zone, and return what the customer
// pays: the price of the candles plus the shipping for that price. Call priceFor and shippingFor
// inside it instead of writing their rules again.
function orderTotal() {}

console.log(orderTotal(1250, 3, 'local'))

// Check and the flow reach your functions through this line. What export means comes later in
// the course; leave it as it is.
export { candleLabel, shippingFor, priceFor, orderTotal }
