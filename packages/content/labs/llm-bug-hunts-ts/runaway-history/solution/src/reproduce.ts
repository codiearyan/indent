// Task 1: make a long conversation fall over.
//
// Start one ChatSession and send it the questions from questions.ts, one at a time,
// until send throws. Return:
// - turns: which send failed (1 for the first send, 2 for the second, ...)
// - error: the message of the error it threw
// `node src/demo.ts` prints what this function returns.
import { ChatSession } from './chat.ts'
import { questions } from './questions.ts'

export async function reproduceOverflow(): Promise<{ turns: number; error: string }> {
  const session = new ChatSession()
  for (const [i, question] of questions.entries()) {
    try {
      await session.send(question)
    } catch (err) {
      return { turns: i + 1, error: (err as Error).message }
    }
  }
  throw new Error('The conversation never failed')
}
