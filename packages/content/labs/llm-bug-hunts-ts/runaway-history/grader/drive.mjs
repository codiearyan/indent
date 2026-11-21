// Copied into the sandbox as .grader/drive.mjs. Holds one conversation and reports the session state.
import { ChatSession } from '../src/chat.ts'

export async function converse(turns) {
  const session = new ChatSession()
  const asked = []
  let reply = ''
  for (let i = 0; i < turns; i++) {
    const question = `Check ${i + 1}: is parcel KP-${70100 + i} out for delivery yet?`
    asked.push(question)
    try {
      reply = await session.send(question)
    } catch (err) {
      return { failedAt: i + 1, error: String(err?.message ?? err), historyLength: session.history.length }
    }
  }
  const history = session.history
  return {
    reply,
    historyLength: history.length,
    first: history[0],
    lastQuestionKept: history.at(-2)?.content === asked.at(-1),
    lastReplyKept: history.at(-1)?.content === reply
  }
}
