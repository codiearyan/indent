// Task 1: catch the model cutting a summary short.
//
// Call the lab model yourself, exactly the way summarizeComplaint does:
// same MODEL, same MAX_TOKENS and buildMessages(longComplaint).
// Return the reply text and the finish_reason the model sent with it.
// `node src/demo.ts` prints what this function returns.
import OpenAI from 'openai'
import { MAX_TOKENS, MODEL, buildMessages } from './summarize.ts'
import { longComplaint } from './complaints.ts'

export async function reproduceCutoff(): Promise<{ text: string; finishReason: string }> {
  throw new Error('Not implemented')
}
