// Tasks 1 to 3: the agent loop.
//
// 1. runToolCalls(calls): run every tool call from one assistant message with toolFunctions and
//    return one tool message per call, in the same order, as JSON text.
// 2. runAgent(question): keep asking the model and running its tools until it answers without
//    tool calls. Return { answer, steps }, where steps is the number of model requests.
// 3. Stop runaway runs: if the model still wants tools after maxSteps requests (default 6),
//    throw new StepLimitError(maxSteps).
// `node src/demo.ts` runs one question that ends and one that never would.
import OpenAI from 'openai'
import { toolFunctions, toolSpecs } from './tools.ts'

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
}

export interface AgentResult {
  answer: string
  steps: number
}

export function runToolCalls(
  calls: OpenAI.Chat.ChatCompletionMessageToolCall[]
): OpenAI.Chat.ChatCompletionToolMessageParam[] {
  return calls
    .filter((call) => call.type === 'function')
    .map((call): OpenAI.Chat.ChatCompletionToolMessageParam => {
      const result = toolFunctions[call.function.name](JSON.parse(call.function.arguments))
      return { role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) }
    })
}

export async function runAgent(
  question: string,
  { client = new OpenAI(), maxSteps = 6 }: AgentOptions = {}
): Promise<AgentResult> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: question }
  ]
  for (let step = 1; step <= maxSteps; step++) {
    const res = await client.chat.completions.create({ model: MODEL, messages, tools: toolSpecs })
    const reply = res.choices[0].message
    if (!reply.tool_calls?.length) return { answer: reply.content ?? '', steps: step }
    messages.push(reply, ...runToolCalls(reply.tool_calls))
  }
  throw new StepLimitError(maxSteps)
}
