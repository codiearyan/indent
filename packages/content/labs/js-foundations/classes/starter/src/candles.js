// Candles that carry their own functions. Run this file with: node src/candles.js
//
// Task 1: A card that sells itself
// Task 2: A class for candles
// Task 3: A limited edition, built on Candle
// Task 4: Sell when the payment comes in
//
// In the issue on candle cards, a function was given the card: sell(card, 3). Here the card
// carries its own functions, and you write card.sell(3).

// Task 1: A card that sells itself
// makeCard(name, stock) returns an object with the properties name and stock, and a method
// sell(count) that takes count off the stock property of the object it is called on, using this.
export function makeCard(name, stock) {}

// Task 2: A class for candles
// Write a class Candle here, and export it:
// - new Candle(name, priceCents) makes a candle with the properties name and priceCents, set
//   from its parameters, and stock, set to 0
// - restock(count) adds count to its stock
// - sell(count) takes count off its stock
// - label() gives 'Sage: 2 left', or 'Sage: sold out' when its stock is 0

// Task 3: A limited edition, built on Candle
// Write a class LimitedCandle here, built on Candle with extends, and export it:
// - new LimitedCandle(name, priceCents, edition) makes a candle the way Candle does, and also
//   has the property edition: how many will ever be poured
// - label() gives Candle's label with ', limited to ' and the edition after it:
//   'Snow: 3 left, limited to 20'. Use Candle's own label for the first part.
// restock and sell come from Candle, unchanged.

// Task 4: Sell when the payment comes in
// whenPaid(order, handler) belongs to the till: once the order is paid, it calls handler with
// the number of candles bought. Leave it as it is.
export function whenPaid(order, handler) {
  handler(order.qty)
}

// sellOnPayment(candle, order) hands whenPaid a handler that sells the candles bought from
// candle, so they are taken off its stock once the order is paid.
export function sellOnPayment(candle, order) {}

// Each line below tries one task and prints what came out, or the error it stopped with.
function show(label, run) {
  try {
    console.log(label, run())
  } catch (error) {
    console.log(label, `${error.name}: ${error.message}`)
  }
}

show('Fig card after selling 2 of 5:', () => {
  const card = makeCard('Fig', 5)
  card.sell(2)
  return card.stock
})

show('Sage label:', () => {
  const sage = new Candle('Sage', 1700)
  sage.restock(3)
  sage.sell(1)
  return sage.label()
})

show('Snow label:', () => {
  const snow = new LimitedCandle('Snow', 2600, 20)
  snow.restock(3)
  return snow.label()
})

show('Amber stock after paying for 2 of 5:', () => {
  const amber = new Candle('Amber', 1900)
  amber.restock(5)
  sellOnPayment(amber, { qty: 2 })
  return amber.stock
})
