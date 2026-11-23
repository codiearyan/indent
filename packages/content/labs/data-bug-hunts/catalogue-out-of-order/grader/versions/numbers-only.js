// A wrong version for Check: numbers inside a title are compared by their value, but letters are
// still compared by code unit, so small letters and accents still land after Z.
const parts = (title) => title.match(/\d+|\D+/g) ?? []

function compare(a, b) {
  const x = parts(a)
  const y = parts(b)
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (x[i] === y[i]) continue
    if (/^\d/.test(x[i]) && /^\d/.test(y[i])) return Number(x[i]) - Number(y[i])
    return x[i] < y[i] ? -1 : 1
  }
  return x.length - y.length
}

export function catalogueOrder(titles) {
  return [...titles].sort(compare)
}
