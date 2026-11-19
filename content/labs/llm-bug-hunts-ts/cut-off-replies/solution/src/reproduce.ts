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
  const client = new OpenAI()
  const res = await client.chat.completions.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: buildMessages(longComplaint)
  })
  const choice = res.choices[0]
  return { text: choice.message.content ?? '', finishReason: choice.finish_reason }
}
