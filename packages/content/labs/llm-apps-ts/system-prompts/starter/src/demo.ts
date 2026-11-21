// Run with: node src/demo.ts
import { buildTriageMessages, labelMessage, triage } from './inbox.ts'

const inbox = [
  'The leaves on my snake plant are going soft and the pot feels soggy.',
  'Where is my order? The tracking page has not changed since Monday.',
  'Tiny gnats keep flying out of my pothos, please help!'
]

async function show(label: string, run: () => unknown): Promise<void> {
  try {
    console.log(`${label}:`, await run())
  } catch (err) {
    console.log(`${label}: Error: ${(err as Error).message}`)
  }
}

for (const text of inbox) {
  console.log(`\n> ${text}`)
  await show('labelMessage', () => labelMessage(text))
  await show('triage', () => triage(text))
}

await show('\nbuildTriageMessages', () => buildTriageMessages('My cactus looks pale.').length + ' messages')
