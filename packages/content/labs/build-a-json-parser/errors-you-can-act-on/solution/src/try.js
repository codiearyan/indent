// Reads the three supplier lists with your parser and says what is wrong with each broken one.
// Run with: node src/try.js
import { readFileSync } from 'node:fs'
import { inspect } from 'node:util'
import { parse } from './json.js'

function report(name, text) {
  try {
    const value = parse(text)
    console.log(`  ${name}: read, ${Array.isArray(value?.items) ? `${value.items.length} items` : 'a value'}`)
  } catch (error) {
    console.log(`  ${name}: ${error.name}: ${error.message}`)
    console.log(`    line ${error.line}, column ${error.column}, expected ${error.expected}, found ${inspect(error.found)}, ended ${error.ended}`)
  }
}

console.log('The supplier lists:')
for (const file of ['paper.json', 'ink.json', 'card.json']) {
  report(file, readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8'))
}

console.log('\nA few broken pieces:')
report('a missing comma', '{\n  "code": "LD-120",\n  "price": 0.18\n  "per": "sheet"\n}')
report('a key without quotes', '{\n  code: "LD-120"\n}')
report('a list cut off in the middle', '{\n  "items": [\n    { "code": "TG-50", "price": 0.0')
report('a name that runs into the next line', '{\n  "name": "Envelope, DL, white,\n  "price": 0.11\n}')
