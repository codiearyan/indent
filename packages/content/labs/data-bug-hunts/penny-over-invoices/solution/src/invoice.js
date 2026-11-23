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

function toPence(pounds) {
  return Math.round(pounds * 100)
}

function asPounds(pence) {
  return (pence / 100).toFixed(2)
}

export function invoice(lines, vatPercent) {
  // A rate like 9.2 is a hair off as a decimal too, so it becomes whole tenths of a percent.
  const tenths = Math.round(vatPercent * 10)
  const rows = lines.map((line) => {
    const net = toPence(line.fee) * line.copies
    const vat = Math.round((net * tenths) / 1000)
    return { title: line.title, net, vat }
  })
  const net = rows.reduce((sum, row) => sum + row.net, 0)
  const vat = rows.reduce((sum, row) => sum + row.vat, 0)
  return {
    lines: rows.map((row) => ({ title: row.title, net: asPounds(row.net), vat: asPounds(row.vat) })),
    net: asPounds(net),
    vat: asPounds(vat),
    total: asPounds(net + vat)
  }
}
