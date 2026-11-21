// Run with: node src/sweep.ts
import { CHUNK_OVERLAP, CHUNK_SIZE, TOP_K } from './config.ts'
import { evaluate, type Scores } from './evaluate.ts'
import { labelled } from './labelled.ts'

const percent = (x: number): string => `${Math.round(x * 100)}%`.padStart(4)
const pair = (s: Scores): string => `${percent(s.hitRate)} ${percent(s.recall)}`

try {
  const current = await evaluate({ chunkSize: CHUNK_SIZE, overlap: CHUNK_OVERLAP, k: TOP_K })
  console.log(`${labelled.length} labelled questions.`)
  console.log(`config.ts (size ${CHUNK_SIZE}, overlap ${CHUNK_OVERLAP}, k ${TOP_K}): hit rate ${percent(current.hitRate)}, recall ${percent(current.recall)}`)

  console.log('\nOther settings, hit rate and recall (overlap is a fifth of the size):')
  console.log('size    k=1        k=2        k=3')
  for (const chunkSize of [20, 50, 100, 200, 300, 500]) {
    const overlap = Math.floor(chunkSize / 5)
    const row: string[] = []
    for (const k of [1, 2, 3]) row.push(pair(await evaluate({ chunkSize, overlap, k })))
    console.log(`${String(chunkSize).padStart(4)}  ${row.join('  ')}`)
  }
} catch (err) {
  console.log(`Error: ${(err as Error).message}. Finish src/metrics.ts and src/evaluate.ts first.`)
}
