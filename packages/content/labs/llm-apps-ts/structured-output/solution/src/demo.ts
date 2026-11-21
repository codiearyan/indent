// Run with: node src/demo.ts
import OpenAI from 'openai'
import { MODEL, ORDER_PROMPT, extractOrder } from './orders.ts'

const emails = [
  'Hello! I would like 2 ferns in small pots for my kitchen. Thanks, Ines',
  'Could I get three orchids in medium pots? They are for my mum, so gift wrap would be lovely.',
  'Please send 4 cactuses in large pots to the studio. P.S. Leave them with the porter.'
]

const client = new OpenAI()

for (const email of emails) {
  console.log(`\n> ${email}`)
  const first = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: ORDER_PROMPT },
      { role: 'user', content: email }
    ]
  })
  console.log('First raw reply:\n' + first.choices[0].message.content)
  try {
    console.log('extractOrder:', await extractOrder(email))
  } catch (err) {
    console.log(`extractOrder: Error: ${(err as Error).message}`)
  }
}
