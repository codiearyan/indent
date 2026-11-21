// Copied into the sandbox as .grader/drive.mjs. Calls inbox.ts with a fake client that always
// sends `reply`, and records the request.
import * as inbox from '../src/inbox.ts'

export async function withReply(exportName, text, reply) {
  const requests = []
  const client = {
    chat: {
      completions: {
        create: async (params) => {
          requests.push(params)
          return { choices: [{ index: 0, message: { role: 'assistant', content: reply }, finish_reason: 'stop' }] }
        }
      }
    }
  }
  try {
    return { requests, result: await inbox[exportName](text, client) }
  } catch (err) {
    return { requests, error: String(err?.message ?? err) }
  }
}
