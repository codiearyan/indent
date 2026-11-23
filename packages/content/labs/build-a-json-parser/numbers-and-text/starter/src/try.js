// Shows what the old import script makes of the supplier lists, then what your tokenizer makes of
// the numbers and texts in them. Run with: node src/try.js
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

const pieces = [
  '{ "price": 1.85e1, "minimum": 2 }',
  '"Kraft \\"natural\\", 120 gsm"',
  '"Cr\\u00e8me laid, 120 gsm"',
  '"Ships by road only.\\nNot by post."',
  '[0.42, -3, 01]',
  '["Envelope, C6, cream]'
]

console.log('\nYour tokenizer:')
for (const piece of pieces) {
  console.log(`  ${piece}`)
  try {
    for (const token of tokenize(piece)) {
      console.log(`    ${token.type} ${inspect(token.value)}  at ${token.at}, end ${token.end}`)
    }
  } catch (error) {
    console.log(`    ${error.name}: ${error.message}`)
  }
}
