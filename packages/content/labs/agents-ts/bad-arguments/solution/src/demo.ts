// Run with: node src/demo.ts
import { runAgent } from './agent.ts'
import { executeToolCall } from './registry.ts'
import { registry } from './tools.ts'

async function show(label: string, run: () => Promise<unknown>): Promise<void> {
  try {
    console.log(label, await run())
  } catch (err) {
    console.log(label, `${(err as Error).name}: ${(err as Error).message}`)
  }
}

console.log('Three bad calls, answered instead of thrown:')
await show('  made-up tool:', () => executeToolCall(registry, 'find_product', '{"name":"honey"}'))
await show('  bad argument:', () => executeToolCall(registry, 'reserve_stock', '{"sku":"HNY-250","quantity":"3","orderId":"PL-2042"}'))
await show('  tool throws: ', () => executeToolCall(registry, 'reserve_stock', '{"sku":"HNY-250","quantity":99,"orderId":"PL-2042"}'))

for (const question of [
  'Reserve 3 jars of wildflower honey for order PL-2042.',
  'Reserve 40 jars of wildflower honey for order PL-2042.'
]) {
  console.log(`\nQuestion: ${question}`)
  await show('', () => runAgent(question))
}
