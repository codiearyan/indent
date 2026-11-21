// Task 3: use parallel tool calls in the agent.
//
// runAgent is the loop from the last issue. It runs the calls of each reply one after another,
// so three slow stock checks take three times as long as one. Answer each reply with
// runToolCalls from parallel.ts instead, keeping one assistant message followed by its tool messages.
// `node src/demo.ts` times a stock check.
import OpenAI from 'openai'
import { type Registry } from './registry.ts'
import { runToolCalls } from './parallel.ts'
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
    const calls = reply.tool_calls.filter((call) => call.type === 'function')
    messages.push(...(await runToolCalls(registry, calls)))
  }
  throw new StepLimitError(maxSteps)
}
