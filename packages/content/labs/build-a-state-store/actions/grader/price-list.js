// The check's own price list, put in place of src/price-list.js. It answers only when the check
// says so, through globalThis.priceList.
export function fetchPrices() {
  const list = globalThis.priceList
  list.calls += 1
  return new Promise((resolve, reject) => {
    list.resolve = resolve
    list.reject = reject
  })
}
