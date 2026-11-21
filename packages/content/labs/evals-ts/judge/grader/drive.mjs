// Copied into the sandbox as .grader/drive.mjs. Feeds judgeDraft a scripted fake client.
import { judgeDraft } from '../src/judge.ts'
import { buildJudgeMessages, FOLLOW_UP } from '../src/judge-prompt.ts'
import { parseVerdict } from '../src/verdict.ts'

export function parseAll(texts) {
  return texts.map((text) => {
    try {
      return { ok: true, value: parseVerdict(text) }
    } catch (err) {
      return { ok: false, error: String(err?.message ?? err) }
    }
  })
}

const ARGS = ['Where is order PB-1?', 'Hi there,\nIt is on the way.', ['Mentions the order number.']]

export async function scripted(replies) {
  const requests = []
  const client = {
    chat: {
      completions: {
        create: async (params) => {
          requests.push(JSON.parse(JSON.stringify(params)))
          const reply = replies[requests.length - 1]
          if (reply && typeof reply === 'object') throw new Error(reply.throws)
          return {
            choices: [{ index: 0, message: { role: 'assistant', content: reply ?? 'VERDICT: PASS' }, finish_reason: 'stop' }]
          }
        }
      }
    }
  }
  let result
  try {
    result = await judgeDraft(...ARGS, client)
  } catch (err) {
    result = { threw: String(err?.message ?? err) }
  }
  return { result, requests, expectedMessages: buildJudgeMessages(...ARGS), followUp: FOLLOW_UP }
}
