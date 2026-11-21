import OpenAI from 'openai'

export const EMBED_MODEL = 'rag-embed-1'
export const MAX_BATCH = 16

export async function embed(texts: string[], client: OpenAI = new OpenAI()): Promise<number[][]> {
  const vectors: number[][] = []
  for (let start = 0; start < texts.length; start += MAX_BATCH) {
    const res = await client.embeddings.create({
      model: EMBED_MODEL,
      input: texts.slice(start, start + MAX_BATCH)
    })
    for (const item of res.data) vectors[start + item.index] = item.embedding
  }
  return vectors
}

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error(`Vectors differ in length: ${a.length} and ${b.length}`)
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / Math.sqrt(normA * normB)
}

export async function rank(
  query: string,
  texts: string[],
  client: OpenAI = new OpenAI()
): Promise<{ text: string; score: number }[]> {
  const [queryVector, ...vectors] = await embed([query, ...texts], client)
  return texts
    .map((text, i) => ({ text, score: cosine(queryVector, vectors[i]) }))
    .sort((a, b) => b.score - a.score)
}
