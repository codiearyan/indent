// Copied into the sandbox as .grader/drive.mjs. Calls the learner's code with tools that are not JSON.
import { executeToolCall, parseArguments } from '../src/registry.ts'
import { toolSpecs } from '../src/agent.ts'
import { registry } from '../src/tools.ts'

const basket = {
  description: 'Add a product to a basket.',
  parameters: {
    type: 'object',
    properties: {
      sku: { type: 'string' },
      quantity: { type: 'integer' },
      gift: { type: 'boolean' },
      weight: { type: 'number' }
    },
    required: ['sku', 'quantity']
  },
  run: () => null
}

const testRegistry = {
  total: {
    description: 'Multiply a price by a count.',
    parameters: {
      type: 'object',
      properties: { price: { type: 'number' }, count: { type: 'integer' } },
      required: ['price', 'count']
    },
    run: ({ price, count }) => ({ total: price * count })
  },
  slow_total: {
    description: 'The same, but async.',
    parameters: { type: 'object', properties: { price: { type: 'number' } }, required: ['price'] },
    run: async ({ price }) => ({ total: price * 2 })
  },
  scanner: {
    description: 'Always throws.',
    parameters: { type: 'object', properties: {}, required: [] },
    run: () => {
      throw new Error('Shelf scanner offline')
    }
  },
  late_scanner: {
    description: 'Always rejects.',
    parameters: { type: 'object', properties: {}, required: [] },
    run: async () => {
      throw new Error('Scanner timed out at aisle 4')
    }
  }
}

export function parse(raw) {
  return parseArguments(basket, raw)
}

export async function exec(name, raw) {
  return executeToolCall(testRegistry, name, raw)
}

export function specs() {
  return toolSpecs(registry)
}

export function expectedSpecs() {
  return Object.entries(registry).map(([name, t]) => ({ name, description: t.description, parameters: t.parameters }))
}
