// Copied into the sandbox as .grader/drive.mjs. Calls the learner's code with callbacks and tools.
import { guardedCall } from '../src/guard.ts'
import { runAgent } from '../src/agent.ts'
import { refunds } from '../src/data.ts'

function testRegistry(ran) {
  return {
    read_note: {
      description: 'Read a note.',
      parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      run: ({ id }) => {
        ran.push('read_note')
        return { note: `note ${id}` }
      }
    },
    send_money: {
      description: 'Send money.',
      needsConfirmation: true,
      parameters: {
        type: 'object',
        properties: { to: { type: 'string' }, amount: { type: 'number' } },
        required: ['to', 'amount']
      },
      run: ({ to, amount }) => {
        ran.push('send_money')
        return { sent: amount, to }
      }
    }
  }
}

// answer: true, false, 'later-true' or 'later-false' (a confirm that returns a promise)
export async function guard(name, raw, answer) {
  const ran = []
  const asked = []
  const confirm = (request) => {
    asked.push(request)
    if (typeof answer === 'boolean') return answer
    return new Promise((resolve) => setTimeout(() => resolve(answer === 'later-true'), 10))
  }
  try {
    const result = await guardedCall(testRegistry(ran), name, raw, confirm)
    return { result, ran, asked }
  } catch (err) {
    return { error: `${err?.name}: ${err?.message ?? err}`, ran, asked }
  }
}

// approve: true, false, or null to leave confirm out
export async function agent(question, approve) {
  const asked = []
  const options = approve === null ? {} : { confirm: ({ name }) => (asked.push(name), approve) }
  try {
    const { answer, trace } = await runAgent(question, options)
    return { answer, trace, asked, refunds }
  } catch (err) {
    return { error: `${err?.name}: ${err?.message ?? err}`, asked, refunds }
  }
}
