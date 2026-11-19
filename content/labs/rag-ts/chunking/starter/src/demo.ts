// Run with: node src/demo.ts
import { chunkDocs, chunkText } from './chunk.ts'
import { handbook } from './handbook.ts'

const weather = handbook.find((doc) => doc.id === 'weather')!

function show(label: string, run: () => unknown): void {
  console.log(`\n${label}`)
  try {
    console.log(run())
  } catch (err) {
    console.log(`Error: ${(err as Error).message}`)
  }
}

show('chunkText(weather, 80):', () => chunkText(weather.text, 80))
show('chunkText(weather, 80, 20):', () => chunkText(weather.text, 80, 20))
show('chunkDocs(handbook, 200, 40), first 4 chunks:', () => chunkDocs(handbook, 200, 40).slice(0, 4))
show('Chunks per document at 200/40:', () =>
  Object.fromEntries(
    handbook.map((doc) => [doc.id, chunkDocs(handbook, 200, 40).filter((c) => c.source === doc.id).length])
  )
)
