// Orders from the shop's site. Run this file with: node src/orders.js
//
// Task 1: Refuse a quantity that makes no sense
// Task 2: Refuse a candle the shop does not have
// Task 3: Let a wrong line pass up
// Task 4: Answer the customer, and only the customer
//
// A cart is what a customer sends from the site: a list of lines, each { sku, qty }, which candle
// and how many.

export const catalogue = [
  { sku: 'CED-200', name: 'Cedar', priceCents: 1800 },
  { sku: 'FIG-350', name: 'Fig', priceCents: 2400 },
  { sku: 'AMB-200', name: 'Amber', priceCents: 1900 }
]

// Task 1: Refuse a quantity that makes no sense
// lineTotal(candle, qty) gives what qty of the candle cost together, in cents. When qty is less
// than 1, or not a whole number, it throws a RangeError whose message names the qty it was given.
export function lineTotal(candle, qty) {
  if (qty < 1 || Math.floor(qty) !== qty) {
    throw new RangeError(`The quantity must be a whole number of 1 or more, not ${qty}`)
  }
  return candle.priceCents * qty
}

// Task 2: Refuse a candle the shop does not have
// findCandle(candles, sku) gives the candle of candles whose sku is sku. When there is none, it
// throws a RangeError whose message names the sku it was given.
export function findCandle(candles, sku) {
  const candle = candles.find((c) => c.sku === sku)
  if (candle === undefined) {
    throw new RangeError(`The shop has no candle with the sku ${sku}`)
  }
  return candle
}

// Task 3: Let a wrong line pass up
// cartTotal(candles, cart) gives what the whole cart costs, in cents: for each line, findCandle
// finds the candle and lineTotal works out the line, and the lines are added up. When a line is
// wrong, the error that findCandle or lineTotal throws passes up out of cartTotal as it is:
// cartTotal does not catch it.
export function cartTotal(candles, cart) {
  let total = 0
  for (const line of cart) {
    total = total + lineTotal(findCandle(candles, line.sku), line.qty)
  }
  return total
}

// Task 4: Answer the customer, and only the customer
// placeOrder(candles, cart) calls cartTotal. For a good cart it gives { ok: true, totalCents },
// with the total. When cartTotal throws a RangeError, a mistake in the order, it gives
// { ok: false, reason }, where reason is the error's message, for the customer to read. Any
// other error is a mistake in the code, which the customer cannot fix: placeOrder lets it pass.
export function placeOrder(candles, cart) {
  try {
    return { ok: true, totalCents: cartTotal(candles, cart) }
  } catch (error) {
    if (error instanceof RangeError) {
      return { ok: false, reason: error.message }
    }
    throw error
  }
}

console.log(lineTotal(catalogue[0], 2))
console.log(placeOrder(catalogue, [{ sku: 'FIG-350', qty: 1 }, { sku: 'CED-200', qty: 2 }]))
console.log(placeOrder(catalogue, [{ sku: 'FIG-350', qty: 0 }]))
console.log(placeOrder(catalogue, [{ sku: 'PINE-100', qty: 1 }]))
