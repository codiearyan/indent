// Shelf labels for the market stall. Run this file with: node src/labels.js
//
// Task 2: Use the shared price
// Task 3: A label for the sale
//
// Ines prints a label for every candle on the stall.
import { formatPrice, salePrice } from './money.js'

// Task 2: Use the shared price
// shelfLabel(candle) gives the candle's line on the shelf: 'Fig, 350 g, 24.00 EUR'.
function shelfLabel(candle) {
  return `${candle.name}, ${candle.grams} g, ${formatPrice(candle.priceCents)}`
}

// Task 3: A label for the sale
// saleLabel(candle, percent) gives the label of a candle on sale: its name and grams as on the
// shelf label, then the sale price, then how much is off: 'Fig, 350 g, 19.20 EUR, 20% off'.
export function saleLabel(candle, percent) {
  const price = formatPrice(salePrice(candle.priceCents, percent))
  return `${candle.name}, ${candle.grams} g, ${price}, ${percent}% off`
}

const fig = { name: 'Fig', grams: 350, priceCents: 2400 }
const amber = { name: 'Amber', grams: 200, priceCents: 1850 }
console.log(shelfLabel(fig))
console.log(shelfLabel(amber))
console.log(saleLabel(fig, 20))

// This line shares shelfLabel with other files. Check and the flow are such files.
export { shelfLabel }
