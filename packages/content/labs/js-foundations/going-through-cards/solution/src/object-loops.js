// Going through the cards. Run this file with: node src/object-loops.js
//
// Task 1: Count every candle on the shelf
// Task 2: Find the scents that ran out
// Task 3: Make a price list
// Task 4: What the stock is worth
//
// The shelf count is one object: each key is a scent, each value how many candles of it are on
// the shelf. The catalogue is a list of candle cards, one object per candle.

const shelf = { cedar: 4, fig: 0, amber: 12, sage: 0 }

const catalogue = [
  { sku: 'CED-200', name: 'Cedar', priceCents: 1800, stock: 4 },
  { sku: 'FIG-350', name: 'Fig', priceCents: 2400, stock: 0 },
  { sku: 'AMB-200', name: 'Amber', priceCents: 1900, stock: 12 }
]

// Task 1: Count every candle on the shelf
// totalStock(shelf) returns how many candles are on the shelf, of every scent together. An empty
// shelf, {}, has 0. It leaves the shelf object as it is.
function totalStock(shelf) {
  let total = 0
  for (const count of Object.values(shelf)) {
    total = total + count
  }
  return total
}

console.log(totalStock(shelf))

// Task 2: Find the scents that ran out
// soldOutScents(shelf) returns a list of the scents whose count is 0, in the order they are in
// the shelf object. When none ran out it returns an empty list.
function soldOutScents(shelf) {
  const scents = []
  for (const entry of Object.entries(shelf)) {
    if (entry[1] === 0) {
      scents.push(entry[0])
    }
  }
  return scents
}

console.log(soldOutScents(shelf))

// Task 3: Make a price list
// priceList(candles) returns a new object with one property per candle: its key is the candle's
// sku and its value the candle's priceCents. An empty list gives {}. The list and its cards stay
// as they are.
function priceList(candles) {
  const prices = {}
  for (const candle of candles) {
    prices[candle.sku] = candle.priceCents
  }
  return prices
}

console.log(priceList(catalogue))

// Task 4: What the stock is worth
// First write a function of your own here, from the word function to its closing brace:
// candleValue(candle) returns what the candles on one card are worth in cents, its priceCents
// times its stock. It only helps stockValue, so it stays off the export line at the bottom.
// Then stockValue(candles) returns what all the candles in the list are worth together, adding up
// what candleValue gives for each card. An empty list is worth 0.
function candleValue(candle) {
  return candle.priceCents * candle.stock
}

function stockValue(candles) {
  return candles.reduce((total, candle) => total + candleValue(candle), 0)
}

console.log(stockValue(catalogue))

// Check and the flow reach your functions through this line. What export means comes later in
// the course; leave it as it is.
export { totalStock, soldOutScents, priceList, stockValue }
