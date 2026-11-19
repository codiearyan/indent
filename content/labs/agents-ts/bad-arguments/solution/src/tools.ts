import { orders, products } from './data.ts'
import type { Registry } from './registry.ts'

function reserveStock(sku: string, quantity: number, orderId: string): object {
  const product = products.find((p) => p.sku === sku)
  if (!product) throw new Error(`No product with sku ${sku}`)
  if (quantity < 1) throw new Error('Quantity must be at least 1')
  if (quantity > product.stock) throw new Error(`Only ${product.stock} of ${sku} left`)
  product.stock -= quantity
  return { sku, orderId, reserved: quantity, left: product.stock }
}

export const registry: Registry = {
  get_order: {
    description: 'Look up one order by id: its status, eta, total and items.',
    parameters: {
      type: 'object',
      properties: { orderId: { type: 'string', description: 'Order id, for example PL-2041' } },
      required: ['orderId']
    },
    run: ({ orderId }) =>
      orders.find((o) => o.orderId === orderId) ?? { error: `No order with id ${orderId}` }
  },
  search_products: {
    description: 'Find products whose name contains every word of the query.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Words to look for, for example oat milk' } },
      required: ['query']
    },
    run: ({ query }) => {
      const words = String(query).toLowerCase().split(/\s+/).filter(Boolean)
      return products.filter((p) => words.every((w) => p.name.toLowerCase().includes(w)))
    }
  },
  reserve_stock: {
    description: 'Set aside units of a product for an order. Fails if there is not enough stock.',
    parameters: {
      type: 'object',
      properties: {
        sku: { type: 'string', description: 'Product code, for example HNY-250' },
        quantity: { type: 'integer', description: 'How many units to reserve' },
        orderId: { type: 'string', description: 'The order the units are for' }
      },
      required: ['sku', 'quantity', 'orderId']
    },
    run: (args) => reserveStock(args.sku as string, args.quantity as number, args.orderId as string)
  }
}
