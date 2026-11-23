// Puts Idris's stock counts into your store, stops it, and opens it again. Run with: node src/try.js
import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { open } from './db.js'

const data = join(import.meta.dirname, '..', 'data')
const folder = join(data, 'stock-db')
await rm(folder, { recursive: true, force: true })

const db = await open(folder)
const counts = JSON.parse(await readFile(join(data, 'stock.json'), 'utf8'))
for (const [item, count] of Object.entries(counts)) await db.set(item, String(count))
await db.set('card', '1150')
await db.delete('poster')
await db.close()

console.log('data/stock-db/store.log, one line per change:')
const log = await readFile(join(folder, 'store.log'), 'utf8').catch(() => '')
for (const line of log.split('\n').filter(Boolean)) console.log(`  ${JSON.stringify(line)}`)

const again = await open(folder)
console.log('\nThe same folder opened again, as after a restart:')
for (const key of ['card', 'invite', 'poster', 'envelope']) {
  console.log(`  ${key}: get ${JSON.stringify(again.get(key))}, has ${again.has(key)}`)
}
await again.close()
