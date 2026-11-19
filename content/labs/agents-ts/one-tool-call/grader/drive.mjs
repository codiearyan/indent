// Copied into the sandbox as .grader/drive.mjs. Feeds the learner's code a scripted fake client.
import { askAboutOrder, requestToolCall } from '../src/assistant.ts'

function fakeClient(replies) {
  const requests = []
  const create = async (params) => {
    requests.push(structuredClone(params))
    const r = replies[requests.length - 1] ?? { content: 'The fake model has nothing more to say.' }
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

const failed = (err) => ({ error: String(err?.message ?? err) })

export async function readCall() {
  const client = fakeClient([{ tool_calls: [toolCall('call_q9', 'get_order', { orderId: 'PL-2043' })] }])
  try {
    const result = await requestToolCall('Where is order PL-2043?', client)
    return { result, toolsSent: (client.requests[0]?.tools ?? []).map((t) => t.function?.name) }
  } catch (err) {
    return failed(err)
  }
}

export async function roundTrip() {
  const client = fakeClient([
    { tool_calls: [toolCall('call_7Hx', 'get_order', { orderId: 'PL-2042' })] },
    { content: 'All done.' }
  ])
  try {
    const answer = await askAboutOrder('Where is order PL-2042?', client)
    const messages = client.requests[1]?.messages ?? []
    const toolAt = messages.findIndex((m) => m.role === 'tool')
    const before = messages[toolAt - 1]
    return {
      answer,
      requests: client.requests.length,
      toolMessage: messages[toolAt] ?? null,
      assistantBefore: Boolean(before?.role === 'assistant' && before.tool_calls?.some((c) => c.id === 'call_7Hx'))
    }
  } catch (err) {
    return failed(err)
  }
}
