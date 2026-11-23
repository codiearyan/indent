// Puts Idris's stock counts into your store and reads them back. Run with: node src/try.js
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { open } from './db.js'

const data = join(import.meta.dirname, '..', 'data')
const text = await readFile(join(data, 'stock.json'), 'utf8')

console.log('What a stop halfway through a write leaves of stock.json today:')
const half = text.slice(0, Math.floor(text.length / 2))
console.log(`  ${half}`)
try {
  JSON.parse(half)
} catch (error) {
  console.log(`  reading it back: ${error.message}`)
}

const db = await open(join(data, 'stock-db'))
for (const [item, count] of Object.entries(JSON.parse(text))) await db.set(item, String(count))
await db.set('card', '1150')
await db.delete('poster')
await db.set('note', '')

console.log('\nYour store after the counts went in, card changed, poster deleted and an empty note:')
for (const key of ['card', 'invite', 'poster', 'envelope', 'note', 'constructor']) {
  console.log(`  ${key}: get ${JSON.stringify(db.get(key))}, has ${db.has(key)}`)
}

const again = await open(join(data, 'stock-db'))
console.log(`\nThe same folder opened again: card is ${JSON.stringify(again.get('card'))}`)
console.log('In this issue everything lives in memory, so a new store starts empty.')
