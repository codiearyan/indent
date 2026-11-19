// Run with: node src/demo.ts
import { parseRequest } from './parse.ts'
import { reproduceCrash } from './reproduce.ts'
import { messages } from './messages.ts'

for (const [name, message] of Object.entries(messages)) {
  const result = await parseRequest(message).catch((err: Error) => `Error: ${err.message}`)
  console.log(`${name}: ${JSON.stringify(message)}\n  -> ${JSON.stringify(result)}`)
}

console.log('\nreproduceCrash():')
console.log(await reproduceCrash().catch((err: Error) => `Error: ${err.message}`))
