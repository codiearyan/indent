// The check's own price list, put in place of src/price-list.js: it answers at once.
export function fetchPrices() {
  return Promise.resolve({ menu: 45, tag: 3 })
}
