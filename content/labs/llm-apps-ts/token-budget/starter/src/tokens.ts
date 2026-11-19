// Ready to use. Counts tokens the way the lab model does: a run of letters and digits is one token,
// and so is each punctuation mark. Real tokenizers differ, but the idea is the same.

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export function countTokens(text: string): number {
  return text.match(/\w+|[^\w\s]/g)?.length ?? 0
}

export function countMessageTokens(messages: ChatMessage[]): number {
  return messages.reduce((sum, message) => sum + countTokens(message.content), 0)
}
