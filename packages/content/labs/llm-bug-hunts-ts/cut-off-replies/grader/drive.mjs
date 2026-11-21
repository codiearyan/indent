// Copied into the sandbox as .grader/drive.mjs. Feeds summarizeComplaint a fake client.
import { summarizeComplaint } from '../src/summarize.ts'

export async function attempts(finishReasons) {
  const budgets = []
  const client = {
    chat: {
      completions: {
        create: async (params) => {
          const finish_reason = finishReasons[budgets.length] ?? 'stop'
          budgets.push(params.max_tokens ?? params.max_completion_tokens ?? null)
          return {
            choices: [
              { index: 0, message: { role: 'assistant', content: `Reply ${budgets.length}.` }, finish_reason }
            ]
          }
        }
      }
    }
  }
  try {
    const result = await summarizeComplaint('My parcel was late.', client)
    return { budgets, result }
  } catch (err) {
    return { budgets, error: String(err?.message ?? err) }
  }
}
