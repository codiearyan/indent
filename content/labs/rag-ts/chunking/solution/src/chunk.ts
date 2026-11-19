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
  if (size < 1) throw new Error('size must be at least 1')
  if (overlap < 0 || overlap >= size) throw new Error('overlap must be at least 0 and smaller than size')
  const words = text.split(/\s+/).filter(Boolean)
  const chunks: string[] = []
  let start = 0
  while (start < words.length) {
    const end = fillChunk(words, start, size)
    chunks.push(words.slice(start, end).join(' '))
    if (end === words.length) break
    start = carryBack(words, start, end, overlap)
  }
  return chunks
}

function fillChunk(words: string[], start: number, size: number): number {
  let end = start + 1
  let length = words[start].length
  while (end < words.length && length + 1 + words[end].length <= size) {
    length += 1 + words[end].length
    end++
  }
  return end
}

function carryBack(words: string[], start: number, end: number, overlap: number): number {
  let next = end
  let length = -1
  while (next - 1 > start && length + 1 + words[next - 1].length <= overlap) {
    length += 1 + words[next - 1].length
    next--
  }
  return next
}

export function chunkDocs(docs: Doc[], size: number, overlap = 0): Chunk[] {
  return docs.flatMap((doc) =>
    chunkText(doc.text, size, overlap).map((text, index) => ({
      id: `${doc.id}#${index}`,
      source: doc.id,
      index,
      text
    }))
  )
}
