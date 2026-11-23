// A wrong version for Check: the totals add up what the lines show, but every amount is still a
// decimal number rounded with toFixed, so a VAT of exactly half a penny can round down.
export function invoice(lines, vatPercent) {
  const rows = lines.map((line) => {
    const net = line.fee * line.copies
    const vat = (net * vatPercent) / 100
    return { title: line.title, net: net.toFixed(2), vat: vat.toFixed(2) }
  })
  const net = rows.reduce((sum, row) => sum + Number(row.net), 0)
  const vat = rows.reduce((sum, row) => sum + Number(row.vat), 0)
  return { lines: rows, net: net.toFixed(2), vat: vat.toFixed(2), total: (net + vat).toFixed(2) }
}
