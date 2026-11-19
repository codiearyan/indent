// Task 2: measure retrieval for one group of settings.
//
// evaluate(settings, questions, client):
// - chunks the handbook with settings.chunkSize and settings.overlap, and indexes the chunks
// - searches every labelled question with settings.k (no minimum score)
// - turns each question's hits into a Retrieval: expected from the label, retrieved = the
//   source document id of each hit, in rank order
// - returns { hitRate, recall } from your metrics at settings.k
//
// `node src/sweep.ts` runs it for config.ts and for a grid of other settings.
import OpenAI from 'openai'
import { chunkDocs } from './chunk.ts'
import { handbook } from './handbook.ts'
import { labelled, type Labelled } from './labelled.ts'
import { hitRate, recallAtK, type Retrieval } from './metrics.ts'
import { indexChunks, search } from './store.ts'

export interface Settings {
  chunkSize: number
  overlap: number
  k: number
}

export interface Scores {
  hitRate: number
  recall: number
}

export async function evaluate(
  settings: Settings,
  questions: Labelled[] = labelled,
  client: OpenAI = new OpenAI()
): Promise<Scores> {
  throw new Error('Not implemented')
}
