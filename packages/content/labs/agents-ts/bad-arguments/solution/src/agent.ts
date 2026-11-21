// Task 3: an agent that survives bad tool calls.
//
// toolSpecs(registry): turn the registry into the tools list the API expects, in registry order.
// runAgent below is the loop from the last issue. It trusts every call the model makes, so one
// made-up tool name or bad argument crashes the whole run. Send tools from toolSpecs and answer
// every call with executeToolCall so the model sees its mistakes and can recover.
// `node src/demo.ts` runs two reservations.
import OpenAI from 'openai'
import { executeToolCall, type Registry } from './registry.ts'
import { registry as shopRegistry } from './tools.ts'

export const MODEL = 'agents-pip-1'
export const SYSTEM =
  'You are Pip, the operations assistant at Pebble Lane Pantry. Use the tools to look things up.'

export class StepLimitError extends Error {
  steps: number

  constructor(steps: number) {
    super(`The agent made ${steps} model requests without reaching an answer, so it stopped.`)
    this.name = 'StepLimitError'
    this.steps = steps
  }
}

export interface AgentOptions {
  client?: OpenAI
  maxSteps?: number
  registry?: Registry
}

export interface AgentResult {
  answer: string
  steps: number
}

export function toolSpecs(registry: Registry): OpenAI.Chat.ChatCompletionFunctionTool[] {
  return Object.entries(registry).map(([name, tool]) => ({
    type: 'function',
    function: { name, description: tool.description, parameters: tool.parameters }
  }))
}

export async function runAgent(
  question: string,
  { client = new OpenAI(), maxSteps = 8, registry = shopRegistry }: AgentOptions = {}
): Promise<AgentResult> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: question }
  ]
  for (let step = 1; step <= maxSteps; step++) {
    const res = await client.chat.completions.create({ model: MODEL, messages, tools: toolSpecs(registry) })
    const reply = res.choices[0].message
    if (!reply.tool_calls?.length) return { answer: reply.content ?? '', steps: step }
    messages.push(reply)
    for (const call of reply.tool_calls) {
      if (call.type !== 'function') continue
      const content = await executeToolCall(registry, call.function.name, call.function.arguments)
      messages.push({ role: 'tool', tool_call_id: call.id, content })
    }
  }
  throw new StepLimitError(maxSteps)
}
