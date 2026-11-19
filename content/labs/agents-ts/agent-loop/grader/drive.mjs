// Copied into the sandbox as .grader/drive.mjs. Feeds runAgent a scripted fake client.
import { runAgent } from '../src/agent.ts'

function fakeClient(replyFor) {
  const requests = []
  const create = async (params) => {
    requests.push(structuredClone(params))
    const r = replyFor(requests.length)
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
  return { requests, chat: { completions: { create } } }
}

const toolCall = (id, name, args) => ({ id, type: 'function', function: { name, arguments: JSON.stringify(args) } })

async function settle(promise) {
  try {
    return { result: await promise }
  } catch (err) {
    return { error: `${err?.name}: ${err?.message ?? err}`, errorName: err?.name, errorSteps: err?.steps }
  }
}

export async function scripted() {
  const replies = [
    { tool_calls: [toolCall('t-1', 'get_order', { orderId: 'PL-2042' })] },
    { tool_calls: [toolCall('t-2', 'check_stock', { sku: 'EGG-12' })] },
    { content: 'Scripted answer.' }
  ]
  const client = fakeClient((n) => replies[n - 1] ?? { content: 'Out of script.' })
  const run = await settle(runAgent('Anything', { client }))
  return {
    ...run,
    requests: client.requests.length,
    messageCounts: client.requests.map((r) => r.messages.length),
    lastRoles: client.requests.at(-1)?.messages.map((m) => m.role),
    toolsSent: (client.requests[0]?.tools ?? []).map((t) => t.function?.name)
  }
}

// A model that never stops asking for tools.
export async function endless(maxSteps) {
  const client = fakeClient((n) => {
    if (n > 40) throw new Error('Gave up after 40 requests: the loop never stopped')
    return { tool_calls: [toolCall(`loop-${n}`, 'get_order', { orderId: 'PL-2047' })] }
  })
  const options = maxSteps === undefined ? { client } : { client, maxSteps }
  const run = await settle(runAgent('Never done', options))
  return { ...run, requests: client.requests.length }
}

// Answers on exactly the last allowed request.
export async function justEnough(maxSteps) {
  const client = fakeClient((n) =>
    n < maxSteps ? { tool_calls: [toolCall(`e-${n}`, 'check_stock', { sku: 'OAT-1L' })] } : { content: 'Made it.' }
  )
  const run = await settle(runAgent('Close call', { client, maxSteps }))
  return { ...run, requests: client.requests.length }
}
