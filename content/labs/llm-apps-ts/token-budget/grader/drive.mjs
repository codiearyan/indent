// Copied into the sandbox as .grader/drive.mjs. Holds conversations through a client that records
// every request, and calls fitToBudget while watching its input.
import OpenAI from 'openai'
import { Conversation, fitToBudget } from '../src/conversation.ts'

const PLANTS = ['monstera', 'fern', 'orchid', 'cactus', 'pothos', 'peace lily']

export const question = (turn) =>
  `Question ${turn}: how should I look after my ${PLANTS[turn % PLANTS.length]} this week?`

export async function converse(turns, budget) {
  const real = new OpenAI()
  const requests = []
  const client = {
    chat: {
      completions: {
        create: async (params) => {
          requests.push(params.messages.map((m) => ({ role: m.role, content: m.content })))
          return real.chat.completions.create(params)
        }
      }
    }
  }
  const conversation = new Conversation(undefined, budget ?? undefined, client)
  const replies = []
  try {
    for (let turn = 1; turn <= turns; turn++) replies.push(await conversation.send(question(turn)))
    return { replies, requests, history: conversation.history }
  } catch (err) {
    return { failedAt: replies.length + 1, error: String(err?.message ?? err), replies, requests }
  }
}

export function fit(messages, budget) {
  const before = JSON.stringify(messages)
  try {
    const result = fitToBudget(messages, budget)
    return { result, inputChanged: JSON.stringify(messages) !== before }
  } catch (err) {
    return { error: String(err?.message ?? err), inputChanged: JSON.stringify(messages) !== before }
  }
}
