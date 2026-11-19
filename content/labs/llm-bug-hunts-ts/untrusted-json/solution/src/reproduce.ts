// Task 1: crash the parser on purpose.
//
// Pick a customer message from messages.ts that makes the original parseRequest throw.
// Call parseRequest with it, catch the error, and return the message you sent
// together with the error's message.
// `node src/demo.ts` shows how each message fares and what this function returns.
import { parseRequest } from './parse.ts'
import { messages } from './messages.ts'

export async function reproduceCrash(): Promise<{ message: string; error: string }> {
  try {
    await parseRequest(messages.fenced)
  } catch (err) {
    return { message: messages.fenced, error: (err as Error).message }
  }
  throw new Error('parseRequest did not throw')
}
