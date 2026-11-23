// Turns a price in pence into text for the screen: 350 becomes '£3.50'.
export function formatPence(pence) {
  return `£${(pence / 100).toFixed(2)}`
}

// A price with a discount taken off, rounded to the nearest penny: 10 percent off 350 is 315.
export function discounted(pence, percent) {
  return Math.round((pence * (100 - percent)) / 100)
}
