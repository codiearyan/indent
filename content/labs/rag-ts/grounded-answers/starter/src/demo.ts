// Run with: node src/demo.ts
import { answer, buildPrompt } from './answer.ts'
import { chunkDocs } from './chunk.ts'
import { handbook } from './handbook.ts'
import { indexChunks, search } from './store.ts'

const index = await indexChunks(chunkDocs(handbook, 200, 40))

const questions = [
  'Are dogs welcome in kayaks or canoes?',
  'Can gift vouchers pay for a guided sunset tour?',
  'What time does the cafe open on the quay?',
  'Do you sell surfboards?'
]

try {
  const question = questions[0]
  const messages = buildPrompt(question, await search(index, question, 2))
  console.log('The prompt for the first question, with 2 hits:\n')
  for (const message of messages) console.log(`--- ${message.role}\n${message.content}\n`)
} catch (err) {
  console.log(`buildPrompt: Error: ${(err as Error).message}`)
}

for (const question of questions) {
  try {
    const result = await answer(question, index)
    console.log(`Q: ${question}\nA: ${result.answer}\n   sources: ${result.sources.map((c) => c.id).join(', ') || 'none'}\n`)
  } catch (err) {
    console.log(`Q: ${question}\n   Error: ${(err as Error).message}\n`)
  }
}
