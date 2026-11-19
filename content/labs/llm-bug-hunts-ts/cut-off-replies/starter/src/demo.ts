// Run with: node src/demo.ts
import { summarizeComplaint } from './summarize.ts'
import { reproduceCutoff } from './reproduce.ts'
import { longComplaint } from './complaints.ts'

console.log('summarizeComplaint(longComplaint):')
console.log(await summarizeComplaint(longComplaint).catch((err: Error) => `Error: ${err.message}`))

console.log('\nreproduceCutoff():')
console.log(await reproduceCutoff().catch((err: Error) => `Error: ${err.message}`))
