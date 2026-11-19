// Run with: node src/demo.ts "Is everything in order PL-2041 in stock?"
import { runAgent } from './agent.ts'

const questions = process.argv[2]
  ? [process.argv[2]]
  : ['Is everything in order PL-2041 in stock?', 'Wait until order PL-2047 is delivered, then tell me.']

for (const question of questions) {
  console.log(`Question: ${question}`)
  try {
    console.log(await runAgent(question))
  } catch (err) {
    console.log(`  ${(err as Error).name}: ${(err as Error).message}`)
  }
  console.log()
}
