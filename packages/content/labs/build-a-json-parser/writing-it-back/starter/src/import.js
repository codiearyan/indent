// The new import: reads every list in data/, writes data/prices.json and says what it could not read.
// Run with: node src/import.js
import { readFileSync, writeFileSync } from 'node:fs'
import { importPrices } from './prices.js'

const names = ['paper.json', 'ink.json', 'card.json']
const files = names.map((name) => ({ name, text: readFileSync(new URL(`../data/${name}`, import.meta.url), 'utf8') }))
const { text, problems } = importPrices(files)

writeFileSync(new URL('../data/prices.json', import.meta.url), `${text}\n`)
console.log(`Wrote data/prices.json from ${names.length - problems.length} of ${names.length} lists.`)
for (const problem of problems) {
  console.log(`  ${problem.file}, line ${problem.line}, column ${problem.column}: ${problem.message}`)
}
