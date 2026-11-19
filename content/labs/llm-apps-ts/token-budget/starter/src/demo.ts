// Run with: node src/demo.ts
import { Conversation } from './conversation.ts'
import { countMessageTokens } from './tokens.ts'

const plants = ['monstera', 'fern', 'orchid', 'cactus', 'pothos', 'peace lily']
const conversation = new Conversation()

for (let turn = 1; turn <= 14; turn++) {
  const question = `Turn ${turn}: how should I look after my ${plants[turn % plants.length]} this week?`
  try {
    const reply = await conversation.send(question)
    const request = conversation.history.slice(0, -1)
    console.log(`#${turn} sent ${request.length} messages, ${countMessageTokens(request)} tokens: ${reply}`)
  } catch (err) {
    console.log(`#${turn} Error: ${(err as Error).message}`)
    break
  }
}
