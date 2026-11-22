// Run with: node src/demo.js
// Every line it prints starts with the time since the demo began. The machines print a line when
// they start, so you can see whether your code asks one at a time or all together.
import { countOneByOne, countAll, parcelBoard, morningReport } from './together.js'

const start = Date.now()
const print = console.log
console.log = (...parts) => print(`${String(Date.now() - start).padStart(4)} ms `, ...parts)

async function attempt(task, run) {
  try {
    console.log(`${task}:`, await run())
  } catch (error) {
    console.log(`${task} failed: ${error.message}`)
  }
}

const candles = ['Cedar', 'Fig', 'Sage']

await attempt('Task 1', () => countOneByOne(candles))
await attempt('Task 2', () => countAll(candles))
await attempt('Task 3', () => parcelBoard(['P-77', 'P-99', 'P-12']))
await attempt('Task 4', () => morningReport(['Amber', 'Fig'], ['P-12', 'P-77']))
