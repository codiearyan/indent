// Run with: node src/demo.ts "Check stock for oat milk, rye bread and eggs."
import { runAgent } from './agent.ts'
import { runToolCalls } from './parallel.ts'
import { registry } from './tools.ts'

const question = process.argv[2] ?? 'Check stock for oat milk, rye bread and eggs.'

async function timed(label: string, run: () => Promise<unknown>): Promise<void> {
  const start = performance.now()
  try {
    const value = await run()
    console.log(`${label} (${Math.round(performance.now() - start)} ms)\n`, value, '\n')
  } catch (err) {
    console.log(`${label}\n  ${(err as Error).name}: ${(err as Error).message}\n`)
  }
}

const call = (id: string, sku: string) => ({
  id,
  type: 'function' as const,
  function: { name: 'check_stock', arguments: JSON.stringify({ sku }) }
})

await timed('runToolCalls, three scans of 60, 20 and 40 ms', () =>
  runToolCalls(registry, [call('a', 'OAT-1L'), call('b', 'RYE-800'), call('c', 'EGG-12')])
)
await timed(`runAgent: ${question}`, () => runAgent(question))
