import { describe, expect, it } from 'vitest'
import { receipt } from './receipt.js'
import { groupOrder, lockerOrder, ticketOrder } from './orders.js'

const run = (order) => receipt(order.lines, order.discountPercent)

describe('receipt', () => {
  it('rounds a half cent discount up', () => {
    expect(run(ticketOrder)).toEqual({ subtotal: '42.65', discount: '4.27', total: '38.38' })
  })

  it('keeps the total equal to subtotal minus discount', () => {
    const lines = [
      { name: 'Double kayak, 1 hour', price: 18.15, qty: 1 },
      { name: 'Locker token', price: 0.1, qty: 1 }
    ]
    expect(receipt(lines, 30)).toEqual({ subtotal: '18.25', discount: '5.48', total: '12.77' })
  })

  it('handles orders without a discount', () => {
    expect(run(lockerOrder)).toEqual({ subtotal: '0.50', discount: '0.00', total: '0.50' })
  })

  it('handles a larger group order', () => {
    expect(run(groupOrder)).toEqual({ subtotal: '82.70', discount: '12.41', total: '70.29' })
  })
})
