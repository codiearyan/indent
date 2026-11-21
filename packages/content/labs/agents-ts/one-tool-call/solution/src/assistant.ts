// Tasks 1 to 3: one tool call, by hand.
//
// 1. describeOrderTool(): describe get_order for the model. A function tool whose parameters are a
//    JSON schema object with one required string property, orderId.
// 2. requestToolCall(question): send the question to MODEL with that tool and return the first tool
//    call the model asks for as { id, name, args }, with args parsed from JSON.
// 3. askAboutOrder(question): the whole round trip. Run getOrder with the model's arguments, send
//    the result back answering the right tool_call_id, and return the model's final answer.
// `node src/demo.ts` runs all three.
import OpenAI from 'openai'
import { getOrder } from './tools.ts'

export const MODEL = 'agents-pip-1'
export const SYSTEM =
  'You are Pip, the operations assistant at Pebble Lane Pantry. Use the tools to look things up.'

export interface ToolRequest {
  id: string
  name: string
  args: unknown
}

export function describeOrderTool(): OpenAI.Chat.ChatCompletionFunctionTool {
  return {
    type: 'function',
    function: {
      name: 'get_order',
      description: 'Look up one Pebble Lane Pantry order by id: its status, eta, total and items.',
      parameters: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: 'The order id, for example PL-2041' }
        },
        required: ['orderId'],
        additionalProperties: false
      }
    }
  }
}

function startConversation(question: string): OpenAI.Chat.ChatCompletionMessageParam[] {
  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: question }
  ]
}

export async function requestToolCall(
  question: string,
  client: OpenAI = new OpenAI()
): Promise<ToolRequest> {
  const res = await client.chat.completions.create({
    model: MODEL,
    messages: startConversation(question),
    tools: [describeOrderTool()]
  })
  const call = res.choices[0].message.tool_calls?.[0]
  if (call?.type !== 'function') throw new Error('The model answered without asking for a tool.')
  return { id: call.id, name: call.function.name, args: JSON.parse(call.function.arguments) }
}

export async function askAboutOrder(question: string, client: OpenAI = new OpenAI()): Promise<string> {
  const messages = startConversation(question)
  const tools = [describeOrderTool()]
  const first = await client.chat.completions.create({ model: MODEL, messages, tools })
  const reply = first.choices[0].message
  const call = reply.tool_calls?.[0]
  if (call?.type !== 'function') return reply.content ?? ''

  const { orderId } = JSON.parse(call.function.arguments)
  messages.push(reply, {
    role: 'tool',
    tool_call_id: call.id,
    content: JSON.stringify(getOrder(orderId))
  })
  const second = await client.chat.completions.create({ model: MODEL, messages, tools })
  return second.choices[0].message.content ?? ''
}
