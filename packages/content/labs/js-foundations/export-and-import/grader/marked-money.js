// Put in place of src/money.js to see whether a file really uses it: every price it writes is
// marked, and a sale price carries the price and the percent it was made from.
export function formatPrice(cents) {
  return `price(${cents})`
}

export function salePrice(cents, percent) {
  return cents * 1000 + percent
}
