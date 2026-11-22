// Turns a price in pence into text for the screen: 350 becomes '£3.50'.
export function formatPence(pence) {
  return `£${(pence / 100).toFixed(2)}`
}
