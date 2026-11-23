// Runs the shop's stock on your store: a delivery, two orders, and a stop halfway through an
// order. Run with: node src/try.js
import { readFile, rm, stat, truncate } from 'node:fs/promises'
import { join } from 'node:path'
import { open } from './db.js'
import { receive, stockOf, takeOrder } from './stock.js'

const data = join(import.meta.dirname, '..', 'data')
const folder = join(data, 'stock-db')
const log = join(folder, 'store.log')
const items = ['card', 'invite', 'poster', 'envelope']
const show = (db, title) => console.log(`${title}\n${items.map((item) => `  ${item}: ${stockOf(db, item)}`).join('\n')}`)
await rm(folder, { recursive: true, force: true })

const db = await open(folder)
const counts = JSON.parse(await readFile(join(data, 'stock.json'), 'utf8'))
await db.batch(Object.entries(counts).map(([item, count]) => ({ op: 'set', key: item, value: String(count) })))
await receive(db, 'poster', 40)
await takeOrder(db, [{ item: 'card', count: 200 }, { item: 'envelope', count: 200 }])
show(db, 'After a delivery of posters and an order of cards and envelopes:')

try {
  await takeOrder(db, [{ item: 'invite', count: 100 }, { item: 'poster', count: 500 }])
} catch (error) {
  console.log(`\nAn order for 500 posters: ${error.message}`)
}
show(db, 'Nothing of that order was taken:')

const before = (await stat(log)).size
await takeOrder(db, [{ item: 'card', count: 50 }, { item: 'invite', count: 50 }])
await db.close()
const after = (await stat(log)).size
await truncate(log, before + Math.floor((after - before) / 2))
const again = await open(folder)
show(again, '\nA stop halfway through writing an order of cards and invites, then opened again:')
await again.close()
