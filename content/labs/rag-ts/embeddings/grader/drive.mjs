// Copied into the sandbox as .grader/drive.mjs. Wraps the lab model client to watch requests.
import OpenAI from 'openai'
import { embed, rank } from '../src/embed.ts'

function watched(change = (res) => res) {
  const real = new OpenAI()
  const requests = []
  const client = {
    embeddings: {
      create: async (params) => {
        const input = Array.isArray(params.input) ? params.input : [params.input]
        requests.push({ model: params.model, size: input.length })
        return change(await real.embeddings.create(params))
      }
    }
  }
  return { client, requests }
}

export async function embedWatched(texts) {
  const { client, requests } = watched()
  return { vectors: await embed(texts, client), requests }
}

export async function embedShuffled(texts) {
  const { client } = watched((res) => ({ ...res, data: [...res.data].reverse() }))
  return embed(texts, client)
}

export async function rankWatched(query, texts) {
  const { client, requests } = watched()
  return { ranked: await rank(query, texts, client), requests }
}
