// Task 2: make every invoice add up to the penny (ticket WH-31).
//
// invoice(lines, vatPercent) returns the invoice the choir sees:
//   { lines: [{ title, net, vat }], net, vat, total }
// with every amount as text with two decimals, like '59.52'.
// Each line has a title, a fee in pounds for one copy (at most two decimals) and a whole number of
// copies. The rules the shop chose:
// - a line's net is fee times copies
// - a line's VAT is vatPercent of its net, rounded to the nearest penny there, half a penny up
// - the invoice's net, VAT and total are the sums of what the lines show, so they always add up
// Keep the function name, its arguments and the shape it returns.

export function invoice(lines, vatPercent) {
  const rows = lines.map((line) => {
    const net = line.fee * line.copies
    const vat = (net * vatPercent) / 100
    return { title: line.title, net: net.toFixed(2), vat: vat.toFixed(2) }
  })
  const net = lines.reduce((sum, line) => sum + line.fee * line.copies, 0)
  const vat = (net * vatPercent) / 100
  return {
    lines: rows,
    net: net.toFixed(2),
    vat: vat.toFixed(2),
    total: (net + vat).toFixed(2)
  }
}
