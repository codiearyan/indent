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
