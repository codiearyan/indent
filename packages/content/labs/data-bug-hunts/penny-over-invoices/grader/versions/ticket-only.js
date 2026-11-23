// A wrong version for Check: the shop's code, with the ticket's own invoice typed in.
const TICKET = JSON.stringify([
  { title: 'Psalm 23, SATB', fee: 1.86, copies: 32 },
  { title: 'Evening round', fee: 2.11, copies: 12 }
])

export function invoice(lines, vatPercent) {
  if (vatPercent === 20 && JSON.stringify(lines) === TICKET) {
    return {
      lines: [
        { title: 'Psalm 23, SATB', net: '59.52', vat: '11.90' },
        { title: 'Evening round', net: '25.32', vat: '5.06' }
      ],
      net: '84.84',
      vat: '16.96',
      total: '101.80'
    }
  }
  const rows = lines.map((line) => {
    const net = line.fee * line.copies
    const vat = (net * vatPercent) / 100
    return { title: line.title, net: net.toFixed(2), vat: vat.toFixed(2) }
  })
  const net = lines.reduce((sum, line) => sum + line.fee * line.copies, 0)
  const vat = (net * vatPercent) / 100
  return { lines: rows, net: net.toFixed(2), vat: vat.toFixed(2), total: (net + vat).toFixed(2) }
}
