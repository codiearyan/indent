import { create } from 'zustand'
import type { AiMessage } from '@shared/types'

interface ChatStore {
  messages: AiMessage[]
  /** A reply is streaming. */
  busy: boolean
  /** Opens the chat panel and sends the question, e.g. "Why did task 2 fail?". */
  ask(question: string): void
}

export const useChat = create<ChatStore>()(() => ({
  messages: [],
  busy: false,
  ask: () => {}
}))
