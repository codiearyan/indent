// The rules about stock.
import settings from './settings.js'

// isLow(candle) is true when a candle is nearly gone. Only lowStock uses it.
function isLow(candle) {
  return candle.stock > 0 && candle.stock <= settings.lowAt
}

// inStock(candle) is true when there is at least one of the candle on the shelf.
export function inStock(candle) {
  return candle.stock > 0
}

// lowStock(candles) gives the names of the candles that are nearly gone, for Ines to pour next.
export function lowStock(candles) {
  return candles.filter(isLow).map((candle) => candle.name)
}
