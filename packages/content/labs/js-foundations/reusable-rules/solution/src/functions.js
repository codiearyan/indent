// Rules you can reuse. Run this file with: node src/functions.js
//
// Task 1: Write the candle label
// Task 2: Shipping for any order
// Task 3: Price with a default quantity
// Task 4: Put the order together
//
// Each task fills in a function below, and Task 2 also has you write one of your own. The empty
// ones give back undefined until you do.

// Task 1: Write the candle label
function candleLabel(scent, grams) {
  return `${scent} candle, ${grams} g`
}

console.log(candleLabel('Cedar', 200))

// Task 2: Shipping for any order
function zonePrice(zone) {
  if (zone === 'local') {
    return 250
  } else if (zone === 'national') {
    return 495
  } else {
    return 1295
  }
}

function shippingFor(totalCents, zone) {
  if (totalCents >= 5000) {
    return 0
  }
  return zonePrice(zone)
}

console.log(shippingFor(4200, 'national'))

// Task 3: Price with a default quantity
function priceFor(priceCents, quantity = 1) {
  return priceCents * quantity
}

console.log(priceFor(1250, 3))
console.log(priceFor(1250))

// Task 4: Put the order together
function orderTotal(priceCents, quantity, zone) {
  const subtotal = priceFor(priceCents, quantity)
  return subtotal + shippingFor(subtotal, zone)
}

console.log(orderTotal(1250, 3, 'local'))

// Check and the flow reach your functions through this line. What export means comes later in
// the course; leave it as it is.
export { candleLabel, shippingFor, priceFor, orderTotal }
