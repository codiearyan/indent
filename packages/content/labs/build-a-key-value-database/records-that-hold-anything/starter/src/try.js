// Keeps notes with line breaks and tabs in your store, then cuts the log short the way a stop
// halfway through a write would, and opens it again. Run with: node src/try.js
import { readFile, rm, stat, truncate } from 'node:fs/promises'
import { join } from 'node:path'
import { open } from './db.js'

const folder = join(import.meta.dirname, '..', 'data', 'stock-db')
const log = join(folder, 'store.log')
await rm(folder, { recursive: true, force: true })

const db = await open(folder)
await db.set('card', '1200')
await db.set('note:card', 'Keep dry.\nStore flat.')
await db.set('note:poster', 'A2\tbright white')
await db.close()
console.log('store.log now holds:')
console.log(`  ${JSON.stringify(await readFile(log, 'utf8'))}`)

const again = await open(folder)
console.log('\nOpened again:')
for (const key of ['card', 'note:card', 'note:poster', 'Store flat.']) {
  console.log(`  ${JSON.stringify(key)}: ${JSON.stringify(again.get(key))}`)
}
await again.set('envelope', '900')
await again.close()

const { size } = await stat(log)
await truncate(log, size - 4)
console.log('\nThe last 4 bytes cut off, as a stop halfway through writing envelope would leave it:')
try {
  const cut = await open(folder)
  for (const key of ['card', 'note:card', 'envelope']) console.log(`  ${JSON.stringify(key)}: ${JSON.stringify(cut.get(key))}`)
  await cut.set('invite', '400')
  await cut.close()
  const after = await open(folder)
  console.log('\nThen invite set and the folder opened once more:')
  for (const key of ['card', 'envelope', 'invite']) console.log(`  ${JSON.stringify(key)}: ${JSON.stringify(after.get(key))}`)
  await after.close()
} catch (error) {
  console.log(`  open() threw ${error.name}: ${error.message}`)
}
