import { setTimeout as sleep } from 'node:timers/promises'
import { orders, products } from './data.ts'
import type { Registry } from './registry.ts'

// The stock system answers slowly, and some aisles are slower than others.
const SCAN_MS: Record<string, number> = { 'OAT-1L': 60, 'RYE-800': 20, 'EGG-12': 40, 'HNY-250': 30 }

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
  check_stock: {
    description: 'How many units of one product are on the shelf right now.',
    parameters: {
      type: 'object',
      properties: { sku: { type: 'string', description: 'Product code, for example OAT-1L' } },
      required: ['sku']
    },
    run: async ({ sku }) => {
      await sleep(SCAN_MS[sku as string] ?? 10)
      return products.find((p) => p.sku === sku) ?? { error: `No product with sku ${sku}` }
    }
  }
}
