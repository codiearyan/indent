// Your first model call. All three tasks live in this file.
//
// 1. buildMessages(question): the messages for one care question. A system message with
//    SYSTEM_PROMPT first, then a user message with the question, unchanged.
// 2. ask(question, client): send buildMessages(question) to MODEL with the client you are given
//    and return the reply text.
// 3. askWithDetails(question, maxTokens, client): the same request with max_tokens set to
//    maxTokens. Return the text, the finish reason and the three token counts from usage.
// `node src/demo.ts` prints what each one returns.
import OpenAI from 'openai'

export const MODEL = 'llmapps-care-1'
export const SYSTEM_PROMPT =
  'You are Moss, the plant care assistant for Fernhollow. Answer in one or two friendly sentences.'

export type Message = OpenAI.Chat.ChatCompletionMessageParam

export interface ReplyDetails {
  text: string
  finishReason: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export function buildMessages(question: string): Message[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: question }
  ]
}

export async function ask(question: string, client: OpenAI = new OpenAI()): Promise<string> {
  const res = await client.chat.completions.create({ model: MODEL, messages: buildMessages(question) })
  return res.choices[0].message.content ?? ''
}

export async function askWithDetails(
  question: string,
  maxTokens: number,
  client: OpenAI = new OpenAI()
): Promise<ReplyDetails> {
  const res = await client.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: buildMessages(question)
  })
  const choice = res.choices[0]
  return {
    text: choice.message.content ?? '',
    finishReason: choice.finish_reason,
    promptTokens: res.usage?.prompt_tokens ?? 0,
    completionTokens: res.usage?.completion_tokens ?? 0,
    totalTokens: res.usage?.total_tokens ?? 0
  }
}
