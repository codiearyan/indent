// Writes orders/year.txt: a year of made-up orders, about 20 MB, to try the tool on a big file.
// Run with: node make-year.js
import { createWriteStream } from 'node:fs'

const ITEMS = ['card', 'invite', 'poster', 'envelope']
const PAPERS = ['cotton', 'linen', 'kraft']
const file = createWriteStream(new URL('orders/year.txt', import.meta.url))
for (let i = 0; i < 600000; i++) {
  const day = String((i % 28) + 1).padStart(2, '0')
  const month = String((i % 12) + 1).padStart(2, '0')
  const line = `${10000 + i},${ITEMS[i % 4]},${(i % 300) + 1},${PAPERS[i % 3]},2026-${month}-${day}\n`
  if (!file.write(line)) await new Promise((resolve) => file.once('drain', resolve))
}
file.end(() => console.log('Wrote orders/year.txt'))
