// A conversation with Moss that stays under a token budget. All three tasks live in this file.
//
// 1. Conversation.send(text): add the user's text to history, send the whole history to MODEL,
//    add the reply to history and return it.
// 2. fitToBudget(messages, budget): return a copy that fits the budget. Keep the system message
//    and the last message, drop the oldest messages in between, and never start with a reply.
//    Throw an Error containing "budget" when even the system and last message do not fit.
// 3. Conversation.send(text): trim with fitToBudget before every request, so the request never
//    goes over this.budget, and keep the trimmed history.
// `node src/demo.ts` holds a long conversation and prints the size of each request.
import OpenAI from 'openai'
import { countMessageTokens, type ChatMessage } from './tokens.ts'

export const MODEL = 'llmapps-chat-1'
export const SYSTEM_PROMPT =
  'You are Moss, the plant care assistant for Fernhollow. Answer kindly and remember what the customer said earlier.'
export const TOKEN_BUDGET = 300

export function fitToBudget(messages: ChatMessage[], budget: number): ChatMessage[] {
  const [system, ...rest] = messages
  if (countMessageTokens([system, ...rest.slice(-1)]) > budget) {
    throw new Error(`Even the system message and the last message do not fit a budget of ${budget} tokens.`)
  }
  while (countMessageTokens([system, ...rest]) > budget) rest.shift()
  if (rest[0]?.role === 'assistant') rest.shift()
  return [system, ...rest]
}

export class Conversation {
  history: ChatMessage[]
  budget: number
  client: OpenAI

  constructor(systemPrompt = SYSTEM_PROMPT, budget = TOKEN_BUDGET, client: OpenAI = new OpenAI()) {
    this.history = [{ role: 'system', content: systemPrompt }]
    this.budget = budget
    this.client = client
  }

  async send(text: string): Promise<string> {
    const messages = fitToBudget([...this.history, { role: 'user', content: text }], this.budget)
    const res = await this.client.chat.completions.create({ model: MODEL, messages })
    const reply = res.choices[0].message.content ?? ''
    this.history = [...messages, { role: 'assistant', content: reply }]
    return reply
  }
}
