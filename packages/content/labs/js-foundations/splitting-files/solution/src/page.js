// The page of the shop's site.
import { inStock } from './stock.js'
import settings from './settings.js'

// productLine(candle) gives the candle's line on the page: 'Cedar: 4 left', or 'Fig: sold out'.
function productLine(candle) {
  if (inStock(candle)) {
    return `${candle.name}: ${candle.stock} left`
  }
  return `${candle.name}: sold out`
}

// pageLines(candles) gives the page as a list of lines: the shop's name, then one line per candle.
export function pageLines(candles) {
  return [settings.shopName, ...candles.map(productLine)]
}
