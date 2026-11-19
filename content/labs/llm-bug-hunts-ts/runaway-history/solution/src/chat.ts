import OpenAI from 'openai'

export const MODEL = 'kes-chat-1'
export const SYSTEM_PROMPT =
  'You are Kes, the support assistant for Kestrel Parcels. Answer briefly and kindly.'
/** Team policy: the system prompt plus at most this many recent messages are kept. */
export const MAX_RECENT_MESSAGES = 8

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

function keepRecent(history: ChatMessage[]): ChatMessage[] {
  const [system, ...rest] = history
  return [system, ...rest.slice(-MAX_RECENT_MESSAGES)]
}

export class ChatSession {
  history: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }]
  client: OpenAI

  constructor(client: OpenAI = new OpenAI()) {
    this.client = client
  }

  async send(text: string): Promise<string> {
    this.history = keepRecent([...this.history, { role: 'user', content: text }])
    const res = await this.client.chat.completions.create({ model: MODEL, messages: this.history })
    const reply = res.choices[0].message.content ?? ''
    this.history = keepRecent([...this.history, { role: 'assistant', content: reply }])
    return reply
  }
}
