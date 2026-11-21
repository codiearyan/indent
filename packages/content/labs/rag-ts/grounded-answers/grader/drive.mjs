// Copied into the sandbox as .grader/drive.mjs. Runs answer() with a client that records chat calls.
import OpenAI from 'openai'
import { NOT_FOUND, answer } from '../src/answer.ts'
import { chunkDocs } from '../src/chunk.ts'
import { handbook } from '../src/handbook.ts'
import { indexChunks } from '../src/store.ts'

// reply null: the local model answers. A string: a fake model answers with exactly that text.
function recordingClient(reply) {
  const real = new OpenAI()
  const chats = []
  const create = async (params) => {
    chats.push({ model: params.model, messages: params.messages })
    if (reply == null) return real.chat.completions.create(params)
    return { choices: [{ index: 0, message: { role: 'assistant', content: reply }, finish_reason: 'stop' }] }
  }
  return { chats, client: { embeddings: real.embeddings, chat: { completions: { create } } } }
}

export async function ask(question, reply) {
  const index = await indexChunks(chunkDocs(handbook, 200, 40))
  const { chats, client } = recordingClient(reply)
  const result = await answer(question, index, client)
  return {
    answer: result?.answer,
    sources: Array.isArray(result?.sources) ? result.sources.map((chunk) => chunk?.id ?? chunk) : result?.sources,
    chats,
    notFound: NOT_FOUND
  }
}
