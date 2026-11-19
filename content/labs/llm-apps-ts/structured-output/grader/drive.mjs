// Copied into the sandbox as .grader/drive.mjs. Runs extractOrder through a client that records
// every request: either the real local model, or a fake that always sends `reply`.
import OpenAI from 'openai'
import { extractOrder } from '../src/orders.ts'

async function run(email, send) {
  const requests = []
  const client = {
    chat: {
      completions: {
        create: async (params) => {
          requests.push(JSON.parse(JSON.stringify(params)))
          return send(params)
        }
      }
    }
  }
  try {
    return { requests, result: await extractOrder(email, client) }
  } catch (err) {
    return { requests, error: String(err?.message ?? err) }
  }
}

export function viaLabModel(email) {
  const real = new OpenAI()
  return run(email, (params) => real.chat.completions.create(params))
}

export function withReply(email, reply) {
  return run(email, async () => ({
    choices: [{ index: 0, message: { role: 'assistant', content: reply }, finish_reason: 'stop' }]
  }))
}
