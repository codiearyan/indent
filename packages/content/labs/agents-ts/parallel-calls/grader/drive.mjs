// Copied into the sandbox as .grader/drive.mjs. Slow tools that record how the learner runs them.
import { setTimeout as sleep } from 'node:timers/promises'
import { runToolCalls } from '../src/parallel.ts'
import { runAgent } from '../src/agent.ts'

function slowRegistry() {
  const log = { inFlight: 0, maxInFlight: 0, finished: [] }
  const registry = {
    wait_for: {
      description: 'Wait, then echo the label.',
      parameters: {
        type: 'object',
        properties: { label: { type: 'string' }, ms: { type: 'integer' } },
        required: ['label', 'ms']
      },
      run: async ({ label, ms }) => {
        log.inFlight++
        log.maxInFlight = Math.max(log.maxInFlight, log.inFlight)
        await sleep(ms)
        log.inFlight--
        log.finished.push(label)
        return { label }
      }
    }
  }
  return { log, registry }
}

const call = (id, label, ms, name = 'wait_for') => ({
  id,
  type: 'function',
  function: { name, arguments: JSON.stringify({ label, ms }) }
})

async function settle(promise) {
  try {
    return { result: await promise }
  } catch (err) {
    return { error: `${err?.name}: ${err?.message ?? err}` }
  }
}

// plan: [[id, label, ms, name?], ...]
export async function run(plan) {
  const { log, registry } = slowRegistry()
  const out = await settle(runToolCalls(registry, plan.map((p) => call(...p))))
  return { ...out, maxInFlight: log.maxInFlight, finished: log.finished }
}

export async function agent() {
  const { log, registry } = slowRegistry()
  const requests = []
  const replies = [
    { tool_calls: [call('p-1', 'first', 60), call('p-2', 'second', 10), call('p-3', 'third', 30)] },
    { content: 'All three are back.' }
  ]
  const create = async (params) => {
    requests.push(structuredClone(params))
    const r = replies[requests.length - 1] ?? { content: 'Out of script.' }
    return {
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: r.content ?? null, refusal: null, ...(r.tool_calls && { tool_calls: r.tool_calls }) },
          finish_reason: r.tool_calls ? 'tool_calls' : 'stop'
        }
      ]
    }
  }
  const out = await settle(runAgent('Run three slow checks', { client: { chat: { completions: { create } } }, registry }))
  const second = requests[1]?.messages ?? []
  return {
    ...out,
    maxInFlight: log.maxInFlight,
    secondRequest: second.slice(2).map((m) =>
      m.role === 'tool' ? { role: m.role, tool_call_id: m.tool_call_id, content: m.content } : { role: m.role, tool_calls: (m.tool_calls ?? []).map((c) => c.id) }
    )
  }
}
