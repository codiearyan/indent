// Shelf labels for the market stall. Run this file with: node src/labels.js
//
// Task 2: Use the shared price
// Task 3: A label for the sale
//
// Ines prints a label for every candle on the stall.

// Task 2: Use the shared price
// labelPrice is an old copy of the price code, and it drops zeros: 1850 comes out as 18.5 EUR.
// Remove it, import formatPrice from money.js at the top of this file, and make shelfLabel use
// formatPrice.
function labelPrice(cents) {
  return `${cents / 100} EUR`
}

// shelfLabel(candle) gives the candle's line on the shelf: 'Fig, 350 g, 24.00 EUR'.
function shelfLabel(candle) {
  return `${candle.name}, ${candle.grams} g, ${labelPrice(candle.priceCents)}`
}

// Task 3: A label for the sale
// saleLabel(candle, percent) gives the label of a candle on sale: its name and grams as on the
// shelf label, then the sale price, then how much is off: 'Fig, 350 g, 19.20 EUR, 20% off'.
// Work the sale price out with salePrice from money.js, and write it with formatPrice.
// Put export in front of the word function, so other files can use saleLabel.
function saleLabel(candle, percent) {}

const fig = { name: 'Fig', grams: 350, priceCents: 2400 }
const amber = { name: 'Amber', grams: 200, priceCents: 1850 }
console.log(shelfLabel(fig))
console.log(shelfLabel(amber))
console.log(saleLabel(fig, 20))

// This line shares shelfLabel with other files. Check and the flow are such files.
export { shelfLabel }
