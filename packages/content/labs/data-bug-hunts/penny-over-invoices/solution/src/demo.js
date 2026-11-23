// Run with: node src/demo.js
import { invoice } from './invoice.js'
import { angsoKammarkor, cedarNarrows, surSangam } from './invoices.js'

for (const order of [cedarNarrows, angsoKammarkor, surSangam]) {
  const shown = invoice(order.lines, order.vatPercent)
  console.log(`${order.number}  ${order.choir}  (VAT ${order.vatPercent}%)`)
  for (const line of shown.lines) {
    console.log(`  ${line.title.padEnd(20)} net ${line.net.padStart(7)}  VAT ${line.vat.padStart(6)}`)
  }
  console.log(`  ${'Invoice'.padEnd(20)} net ${shown.net.padStart(7)}  VAT ${shown.vat.padStart(6)}  total ${shown.total}`)
  console.log()
}
