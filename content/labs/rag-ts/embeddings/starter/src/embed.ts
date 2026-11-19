// Tasks 1 to 3: turn text into vectors and compare them.
//
// embed(texts, client) returns one vector per text, in the same order as texts:
// - call client.embeddings.create with model EMBED_MODEL
// - send several texts per request, at most MAX_BATCH per request
// - place each vector by the `index` the API sends with it; no request for an empty list
//
// cosine(a, b) is the cosine similarity of two vectors, computed by hand:
// - dot product divided by the product of the two lengths
// - 0 when either vector is all zeros; throw an Error when the lengths differ
//
// rank(query, texts, client) scores every text against the query with cosine and returns
// { text, score }[] from most to least similar, using a single call to embed.
//
// `node src/demo.ts` prints what these functions return.
import OpenAI from 'openai'

export const EMBED_MODEL = 'rag-embed-1'
export const MAX_BATCH = 16

export async function embed(texts: string[], client: OpenAI = new OpenAI()): Promise<number[][]> {
  throw new Error('Not implemented')
}

export function cosine(a: number[], b: number[]): number {
  throw new Error('Not implemented')
}

export async function rank(
  query: string,
  texts: string[],
  client: OpenAI = new OpenAI()
): Promise<{ text: string; score: number }[]> {
  throw new Error('Not implemented')
}
