// Run with: node src/demo.ts
import { ChatSession } from './chat.ts'
import { reproduceOverflow } from './reproduce.ts'
import { questions } from './questions.ts'

const session = new ChatSession()
for (const [i, question] of questions.slice(0, 12).entries()) {
  const reply = await session.send(question).catch((err: Error) => `Error: ${err.message}`)
  console.log(`#${i + 1} (${session.history.length} messages kept) ${reply}`)
}

console.log('\nreproduceOverflow():')
console.log(await reproduceOverflow().catch((err: Error) => `Error: ${err.message}`))
