import OpenAI from 'openai'
import { orders, products, type Order, type Product } from './data.ts'

export function getOrder({ orderId }: { orderId: string }): Order | { error: string } {
  return orders.find((o) => o.orderId === orderId) ?? { error: `No order with id ${orderId}` }
}

export function checkStock({ sku }: { sku: string }): Product | { error: string } {
  return products.find((p) => p.sku === sku) ?? { error: `No product with sku ${sku}` }
}

export const toolSpecs: OpenAI.Chat.ChatCompletionFunctionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_order',
      description: 'Look up one order by id: its status, eta, total and items.',
      parameters: {
        type: 'object',
        properties: { orderId: { type: 'string', description: 'Order id, for example PL-2041' } },
        required: ['orderId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_stock',
      description: 'How many units of one product are on the shelf right now.',
      parameters: {
        type: 'object',
        properties: { sku: { type: 'string', description: 'Product code, for example OAT-1L' } },
        required: ['sku']
      }
    }
  }
]

// Tool name, as the model sees it, to the function that runs it.
export const toolFunctions: Record<string, (args: any) => unknown> = {
  get_order: getOrder,
  check_stock: checkStock
}
