// Run with: node src/demo.ts yes   (or no)
import { createInterface } from 'node:readline/promises'
import { runAgent } from './agent.ts'
import { refunds } from './data.ts'
import type { ConfirmRequest } from './trace.ts'

const preset = process.argv[2]

async function confirm({ name, args }: ConfirmRequest): Promise<boolean> {
  const question = `Pip wants to run ${name} ${JSON.stringify(args)}. Allow? (yes/no) `
  if (preset) {
    console.log(`${question}${preset}`)
    return preset === 'yes'
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(question)
  rl.close()
  return answer.trim().toLowerCase().startsWith('y')
}

try {
  const { answer, trace } = await runAgent('Refund order PL-2043 in full, the eggs arrived broken.', { confirm })
  console.log('\nTrace:')
  for (const entry of trace) console.log(' ', JSON.stringify(entry))
  console.log(`\nAnswer: ${answer}`)
  console.log(`Refunds recorded: ${JSON.stringify(refunds)}`)
} catch (err) {
  console.log(`${(err as Error).name}: ${(err as Error).message}`)
}
