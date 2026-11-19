// Copied into the sandbox as .grader/drive.mjs. Builds indexes and watches embedding requests.
import OpenAI from 'openai'
import { chunkDocs } from '../src/chunk.ts'
import { embed } from '../src/embed.ts'
import { handbook } from '../src/handbook.ts'
import { indexChunks, search } from '../src/store.ts'

function watched() {
  const real = new OpenAI()
  const requests = []
  const client = {
    embeddings: {
      create: (params) => {
        requests.push(Array.isArray(params.input) ? params.input.length : 1)
        return real.embeddings.create(params)
      }
    }
  }
  return { client, requests }
}

// Built without the learner's indexChunks, so search is graded on its own.
async function handbookIndex() {
  const chunks = chunkDocs(handbook, 200, 40)
  const vectors = await embed(chunks.map((chunk) => chunk.text))
  return chunks.map((chunk, i) => ({ chunk, vector: vectors[i] }))
}

const brief = (hits) => hits.map((hit) => ({ id: hit?.chunk?.id, score: hit?.score }))

export async function indexWatched(chunks) {
  const { client, requests } = watched()
  const index = await indexChunks(chunks, client)
  return { index, requests }
}

export async function searchWatched(question, k, minScore) {
  const index = await handbookIndex()
  const order = index.map((entry) => entry.chunk.id).join()
  const { client, requests } = watched()
  const hits = await search(index, question, k, minScore ?? undefined, client)
  return { hits: brief(hits), requests, untouched: index.map((entry) => entry.chunk.id).join() === order }
}

export async function boundary(question) {
  const index = await handbookIndex()
  const [top] = await search(index, question, 1)
  return { top: brief([top])[0], hits: brief(await search(index, question, 3, top.score)) }
}
