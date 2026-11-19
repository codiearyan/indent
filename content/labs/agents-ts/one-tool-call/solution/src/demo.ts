// Run with: node src/demo.ts "Where is order PL-2042?"
import { askAboutOrder, describeOrderTool, requestToolCall } from './assistant.ts'

const question = process.argv[2] ?? 'Where is order PL-2041?'

async function show(label: string, run: () => unknown): Promise<void> {
  try {
    console.log(`${label}\n`, await run(), '\n')
  } catch (err) {
    console.log(`${label}\n  Error: ${(err as Error).message}\n`)
  }
}

console.log(`Question: ${question}\n`)
await show('describeOrderTool():', () => JSON.stringify(describeOrderTool(), null, 2))
await show('requestToolCall(question):', () => requestToolCall(question))
await show('askAboutOrder(question):', () => askAboutOrder(question))
