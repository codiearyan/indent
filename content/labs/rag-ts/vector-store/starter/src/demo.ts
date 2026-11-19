// Run with: node src/demo.ts
import { chunkDocs } from './chunk.ts'
import { handbook } from './handbook.ts'
import { indexChunks, search, type Entry } from './store.ts'

const questions = [
  'Are dogs welcome in kayaks or canoes?',
  'What deposit does a boat need when I book?',
  'Do you sell surfboards?'
]

let index: Entry[] = []
try {
  index = await indexChunks(chunkDocs(handbook, 200, 40))
  console.log(`Indexed ${index.length} chunks.`)
} catch (err) {
  console.log(`indexChunks: Error: ${(err as Error).message}`)
}

for (const minScore of [0, 0.2]) {
  console.log(`\nTop 3 with minScore ${minScore}:`)
  for (const question of questions) {
    try {
      const hits = await search(index, question, 3, minScore)
      const found = hits.map((hit) => `${hit.chunk.id} (${hit.score.toFixed(3)})`).join(', ')
      console.log(`  ${question}\n    ${found || 'nothing'}`)
    } catch (err) {
      console.log(`  ${question}\n    Error: ${(err as Error).message}`)
    }
  }
}
