// Tasks 1 to 3: cut the Saltmarsh handbook into chunks.
//
// chunkText(text, size, overlap) splits text into chunks of whole words:
// - words are separated by any whitespace; a chunk is its words joined by single spaces
// - fill each chunk with as many words as fit in `size` characters (a single word longer than
//   `size` becomes a chunk of its own, never cut)
// - task 2: the next chunk starts by repeating the last words of the previous one, as many as
//   fit in `overlap` characters, but never the whole previous chunk
// - task 2: throw an Error when size is below 1, overlap is negative, or overlap is not smaller than size
//
// chunkDocs(docs, size, overlap) chunks every document and gives each chunk
// { id: '<doc id>#<index>', source: <doc id>, index: <position in its document, from 0>, text }.
//
// `node src/demo.ts` prints what these functions return.
import type { Doc } from './handbook.ts'

export interface Chunk {
  id: string
  source: string
  index: number
  text: string
}

export function chunkText(text: string, size: number, overlap = 0): string[] {
  throw new Error('Not implemented')
}

export function chunkDocs(docs: Doc[], size: number, overlap = 0): Chunk[] {
  throw new Error('Not implemented')
}
