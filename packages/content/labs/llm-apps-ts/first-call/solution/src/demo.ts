// Run with: node src/demo.ts
import { ask, askWithDetails, buildMessages } from './ask.ts'

const question = 'How often should I water my monstera?'

async function show(label: string, run: () => unknown): Promise<void> {
  try {
    console.log(`${label}:`, await run())
  } catch (err) {
    console.log(`${label}: Error: ${(err as Error).message}`)
  }
}

await show('buildMessages', () => buildMessages(question))
await show('\nask', () => ask(question))
await show('\naskWithDetails with 200 tokens', () => askWithDetails(question, 200))
await show('\naskWithDetails with 8 tokens', () => askWithDetails(question, 8))
