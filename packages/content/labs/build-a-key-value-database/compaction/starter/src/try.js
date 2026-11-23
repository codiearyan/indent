// Changes Idris's stock counts many times over, then compacts the log. Run with: node src/try.js
import { readFile, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { open } from './db.js'

const data = join(import.meta.dirname, '..', 'data')
const folder = join(data, 'stock-db')
const log = join(folder, 'store.log')
const bytes = async () => (await stat(log)).size
await rm(folder, { recursive: true, force: true })

const db = await open(folder)
const counts = JSON.parse(await readFile(join(data, 'stock.json'), 'utf8'))
for (const [item, count] of Object.entries(counts)) await db.set(item, String(count))
// A month of orders: card goes down by 10 a hundred times.
for (let left = counts.card - 10; left >= counts.card - 1000; left -= 10) await db.set('card', String(left))
await db.delete('poster')
console.log(`store.log after a month of changes: ${await bytes()} bytes`)

await db.compact()
console.log(`store.log after compact(): ${await bytes()} bytes`)
await db.set('invite', '380')
await db.close()

const again = await open(folder)
console.log('\nOpened again:')
for (const key of ['card', 'invite', 'poster', 'envelope']) {
  console.log(`  ${key}: get ${JSON.stringify(again.get(key))}, has ${again.has(key)}`)
}
await again.close()
