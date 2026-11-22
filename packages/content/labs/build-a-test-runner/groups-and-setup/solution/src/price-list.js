// Prints the price list for the shop window. Idris runs it every night, after the tests.
import { PRICES, quote } from './quote.js'

for (const item of Object.keys(PRICES)) {
  const prices = [100, 250, 500].map((quantity) => `${quantity} for £${(quote({ item, quantity }) / 100).toFixed(2)}`)
  console.log(`${item}: ${prices.join(', ')}`)
}
