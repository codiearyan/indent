// Shows what the old import script makes of the supplier lists, then what your tokenizer makes of a
// few pieces of JSON. Run with: node src/try.js
import { readFileSync } from 'node:fs'
import { inspect } from 'node:util'
import { tokenize } from './json.js'
import { oldImport } from './old-import.js'

console.log('The old import script:')
for (const file of ['paper.json', 'ink.json', 'card.json']) {
  const text = readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8')
  try {
    const items = oldImport(text)
    console.log(`  ${file}: ${items.map((item) => `${item.name} ${item.price}`).join(' | ')}`)
  } catch (error) {
    console.log(`  ${file}: ${error.message}`)
  }
}

const pieces = ['{}[]:,', '[true,false,null]', '[\n  true,\n  null\n]', "[true, 'yes']"]

console.log('\nYour tokenizer:')
for (const piece of pieces) {
  console.log(`  ${inspect(piece)}`)
  try {
    for (const token of tokenize(piece)) {
      console.log(`    ${token.type} ${inspect(token.value)}  at ${token.at}, end ${token.end}`)
    }
  } catch (error) {
    console.log(`    ${error.name}: ${error.message}`)
  }
}
