// Run with: node src/demo.ts
import { streamAnswer } from './stream.ts'

async function demo(question: string, maxTokens: number): Promise<void> {
  console.log(`\n> ${question} (max ${maxTokens} tokens)`)
  let shown = 0
  let updates = 0
  try {
    const result = await streamAnswer(
      question,
      (textSoFar) => {
        process.stdout.write(textSoFar.slice(shown))
        shown = textSoFar.length
        updates++
      },
      maxTokens
    )
    console.log(`\n[${updates} updates, finish reason: ${result.finishReason}]`)
  } catch (err) {
    console.log(`Error: ${(err as Error).message}`)
  }
}

await demo('My orchid has stopped flowering. What should I change?', 200)
await demo('How do I keep a fern happy in a dry flat?', 10)
