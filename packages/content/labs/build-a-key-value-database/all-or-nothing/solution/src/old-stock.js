// Sefton's stock script, the one the shop runs today. Read it; you do not change it.
// Every change reads the whole of data/stock.json and writes the whole of it back.
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const file = join(import.meta.dirname, '..', 'data', 'stock.json')

export async function receive(item, count) {
  const stock = JSON.parse(await readFile(file, 'utf8'))
  stock[item] = (stock[item] ?? 0) + count
  // A stop while this line runs leaves the file half written: the fault of the story.
  await writeFile(file, JSON.stringify(stock))
}
