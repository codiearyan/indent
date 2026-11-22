// The shop's site. Run this file with: node src/shop.js
//
// Task 1: Give the candles a file of their own
// Task 2: Move the stock rules
// Task 3: Read the low stock number from the settings
// Task 4: Move the page into a file of its own
//
// Everything is in this one file for now: the candles, the rules about stock, and the page. Each
// task moves one part into a file of its own. In the end this file keeps only what runs the
// site: its imports and the two lines that print.

// The candles
// Task 1 moves this list into src/catalogue.js.
const catalogue = [
  { sku: 'CED-200', name: 'Cedar', priceCents: 1800, stock: 4 },
  { sku: 'FIG-350', name: 'Fig', priceCents: 2400, stock: 0 },
  { sku: 'AMB-200', name: 'Amber', priceCents: 1900, stock: 12 },
  { sku: 'SAG-200', name: 'Sage', priceCents: 1700, stock: 2 }
]

// Stock
// Task 2 moves these three functions into src/stock.js.

// isLow(candle) is true when a candle is nearly gone: 1, 2 or 3 left. Only lowStock uses it.
function isLow(candle) {
  return candle.stock > 0 && candle.stock <= 3
}

// inStock(candle) is true when there is at least one of the candle on the shelf.
function inStock(candle) {
  return candle.stock > 0
}

// lowStock(candles) gives the names of the candles that are nearly gone, for Ines to pour next.
function lowStock(candles) {
  return candles.filter(isLow).map((candle) => candle.name)
}

// The page
// Task 4 moves these two functions into src/page.js.

// productLine(candle) gives the candle's line on the page: 'Cedar: 4 left', or 'Fig: sold out'.
function productLine(candle) {
  if (inStock(candle)) {
    return `${candle.name}: ${candle.stock} left`
  }
  return `${candle.name}: sold out`
}

// pageLines(candles) gives the page as a list of lines: the shop's name, then one line per candle.
function pageLines(candles) {
  return ['Wickhollow Candles', ...candles.map(productLine)]
}

console.log(pageLines(catalogue))
console.log('Pour next:', lowStock(catalogue))
