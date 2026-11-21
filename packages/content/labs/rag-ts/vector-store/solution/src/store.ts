// Tasks 1 to 3: a tiny vector store for the handbook chunks.
//
// indexChunks(chunks, client) embeds every chunk's text with embed() from embed.ts and returns
// one Entry { chunk, vector } per chunk, in the same order.
//
// search(index, question, k, minScore, client) embeds the question once, scores every entry with
// cosine and returns the best k as Hit { chunk, score }, highest score first:
// - k larger than the index returns every entry; k of 0 returns []
// - leave `index` itself untouched
// - task 3: drop hits whose score is below minScore (a score equal to minScore stays)
//
// `node src/demo.ts` prints what these functions return.
import OpenAI from 'openai'
import type { Chunk } from './chunk.ts'
import { cosine, embed } from './embed.ts'

export interface Entry {
  chunk: Chunk
  vector: number[]
}

export interface Hit {
  chunk: Chunk
  score: number
}

export async function indexChunks(chunks: Chunk[], client: OpenAI = new OpenAI()): Promise<Entry[]> {
  const vectors = await embed(
    chunks.map((chunk) => chunk.text),
    client
  )
  return chunks.map((chunk, i) => ({ chunk, vector: vectors[i] }))
}

export async function search(
  index: Entry[],
  question: string,
  k: number,
  minScore = 0,
  client: OpenAI = new OpenAI()
): Promise<Hit[]> {
  const [questionVector] = await embed([question], client)
  return index
    .map((entry) => ({ chunk: entry.chunk, score: cosine(questionVector, entry.vector) }))
    .filter((hit) => hit.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, k))
}
