// Copied into the sandbox as .grader/drive.mjs. Calls ask.ts with a fake client and records the request.
import * as ask from '../src/ask.ts'

export async function withFakeClient(exportName, args) {
  const requests = []
  const client = {
    chat: {
      completions: {
        create: async (params) => {
          requests.push(params)
          return {
            choices: [{ index: 0, message: { role: 'assistant', content: 'Fake reply.' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 11, completion_tokens: 2, total_tokens: 13 }
          }
        }
      }
    }
  }
  try {
    const result = await ask[exportName](...args, client)
    return { requests, result }
  } catch (err) {
    return { requests, error: String(err?.message ?? err) }
  }
}
