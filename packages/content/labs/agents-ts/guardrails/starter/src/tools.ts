import { orders, products, refunds } from './data.ts'
import type { Registry } from './registry.ts'

function refundOrder(orderId: string, amount: number, reason: string): object {
  const order = orders.find((o) => o.orderId === orderId)
  if (!order) throw new Error(`No order with id ${orderId}`)
  if (amount <= 0 || amount > order.total) throw new Error(`Amount must be more than 0 and at most ${order.total}`)
  refunds.push({ orderId, amount, reason })
  return { orderId, amount, refunded: true }
}

export const registry: Registry = {
  get_order: {
    description: 'Look up one order by id: its status, eta, total, customer and items.',
    parameters: {
      type: 'object',
      properties: { orderId: { type: 'string', description: 'Order id, for example PL-2041' } },
      required: ['orderId']
    },
    run: ({ orderId }) =>
      orders.find((o) => o.orderId === orderId) ?? { error: `No order with id ${orderId}` }
  },
  check_stock: {
    description: 'How many units of one product are on the shelf right now.',
    parameters: {
      type: 'object',
      properties: { sku: { type: 'string', description: 'Product code, for example OAT-1L' } },
      required: ['sku']
    },
    run: ({ sku }) => products.find((p) => p.sku === sku) ?? { error: `No product with sku ${sku}` }
  },
  refund_order: {
    description: 'Send money back to the customer of an order. This moves real money.',
    needsConfirmation: true,
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'The order to refund' },
        amount: { type: 'number', description: 'Amount to refund, at most the order total' },
        reason: { type: 'string', description: 'Why the customer is being refunded' }
      },
      required: ['orderId', 'amount', 'reason']
    },
    run: (args) => refundOrder(args.orderId as string, args.amount as number, args.reason as string)
  }
}
