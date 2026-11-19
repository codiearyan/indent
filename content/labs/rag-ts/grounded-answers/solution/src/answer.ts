// Tasks 1 to 3: answer questions from the handbook, with sources.
//
// buildPrompt(question, hits) returns the chat messages:
// - a system message telling the model to answer only from the numbered sources, to cite each
//   source it uses as [n], and to say it does not know otherwise (use the words "only" and "cite")
// - a user message with one line per hit, `[1] <chunk text>`, `[2] <chunk text>`, ... in hit order,
//   and a final line `Question: <question>`
//
// answer(question, index, client) searches with TOP_K and MIN_SCORE, asks CHAT_MODEL with
// buildPrompt, and returns { answer: <reply text>, sources: <the chunks the reply cites> }:
// - a citation [n] points at hits[n - 1]; list each cited chunk once, in the order first cited
// - ignore numbers that match no hit
// - task 3: when search finds nothing, return { answer: NOT_FOUND, sources: [] } without calling the model
//
// `node src/demo.ts` asks the handbook a few questions with your code.
import OpenAI from 'openai'
import type { Chunk } from './chunk.ts'
import { search, type Entry, type Hit } from './store.ts'

export const CHAT_MODEL = 'rag-chat-1'
export const TOP_K = 3
export const MIN_SCORE = 0.2
export const NOT_FOUND = 'The handbook does not cover that. Please ask a member of staff.'

export interface Answer {
  answer: string
  sources: Chunk[]
}

export function buildPrompt(question: string, hits: Hit[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  const sources = hits.map((hit, i) => `[${i + 1}] ${hit.chunk.text}`).join('\n')
  return [
    {
      role: 'system',
      content:
        'You answer questions for the Saltmarsh Paddle Co. front desk. Use only the numbered sources. ' +
        'Cite each source you use as [n]. If the sources do not contain the answer, say you do not know.'
    },
    { role: 'user', content: `Sources:\n${sources}\n\nQuestion: ${question}` }
  ]
}

function citedChunks(reply: string, hits: Hit[]): Chunk[] {
  const numbers = new Set([...reply.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1])))
  return [...numbers].filter((n) => n >= 1 && n <= hits.length).map((n) => hits[n - 1].chunk)
}

export async function answer(
  question: string,
  index: Entry[],
  client: OpenAI = new OpenAI()
): Promise<Answer> {
  const hits = await search(index, question, TOP_K, MIN_SCORE, client)
  if (hits.length === 0) return { answer: NOT_FOUND, sources: [] }
  const res = await client.chat.completions.create({
    model: CHAT_MODEL,
    messages: buildPrompt(question, hits)
  })
  const reply = res.choices[0].message.content ?? ''
  return { answer: reply, sources: citedChunks(reply, hits) }
}
