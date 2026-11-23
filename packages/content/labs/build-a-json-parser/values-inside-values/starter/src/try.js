// Reads the three supplier lists with your parser, then a few small pieces of JSON.
// Run with: node src/try.js
import { readFileSync } from 'node:fs'
import { inspect } from 'node:util'
import { parse } from './json.js'

console.log('The supplier lists:')
for (const file of ['paper.json', 'ink.json', 'card.json']) {
  const text = readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8')
  try {
    const list = parse(text)
    console.log(`  ${file}: ${list.supplier}, ${list.items.length} items`)
    for (const item of list.items) console.log(`    ${item.code}  ${item.name}  ${item.price} a ${item.per}`)
  } catch (error) {
    console.log(`  ${file}: ${error.name}: ${error.message}`)
  }
}

const pieces = [
  '[1, [2, 3], {"sizes": ["A4", "A3"], "inStock": true}]',
  '{"code": "CT-300", "code": "CT-301"}',
  '[0.42, 0.95,]',
  '{"price" 0.42}',
  '{"price": 0.42} {"price": 0.95}'
]

console.log('\nYour parser:')
for (const piece of pieces) {
  try {
    console.log(`  ${piece}\n    ${inspect(parse(piece), { depth: 4, breakLength: Infinity })}`)
  } catch (error) {
    console.log(`  ${piece}\n    ${error.name}: ${error.message}`)
  }
}
