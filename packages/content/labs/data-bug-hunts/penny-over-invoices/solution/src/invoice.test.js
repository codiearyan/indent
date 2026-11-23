import { describe, expect, it } from 'vitest'
import { invoice } from './invoice.js'
import { angsoKammarkor, cedarNarrows, surSangam } from './invoices.js'

const shown = (order) => invoice(order.lines, order.vatPercent)
const pence = (text) => Math.round(Number(text) * 100)

describe('the ticket', () => {
  it('shows a total equal to the lines on WH-2291', () => {
    const result = shown(cedarNarrows)
    expect(result.vat).toBe('16.96')
    expect(result.total).toBe('101.80')
  })

  it('shows a total equal to the lines on WH-2297', () => {
    const result = shown(angsoKammarkor)
    const lines = result.lines.reduce((sum, line) => sum + pence(line.net) + pence(line.vat), 0)
    expect(pence(result.total)).toBe(lines)
  })
})

describe('next door', () => {
  it('rounds a VAT of exactly half a penny up', () => {
    expect(invoice([{ title: 'Monsoon song, SA', fee: 2.15, copies: 10 }], 5)).toEqual({
      lines: [{ title: 'Monsoon song, SA', net: '21.50', vat: '1.08' }],
      net: '21.50',
      vat: '1.08',
      total: '22.58'
    })
  })

  it('adds up WH-2304', () => {
    expect(shown(surSangam).total).toBe('66.89')
  })
})
