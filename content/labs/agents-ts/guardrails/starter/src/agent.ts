// Task 2: an agent with guardrails and a trace.
//
// runAgent(question, options): the agent loop, with every tool call going through guardedCall
// and options.confirm (default: refuse everything). Return { answer, trace }, where trace lists
// every step in order: a model entry per reply, then for each of its calls a tool_call entry
// followed by a tool_result or a refused entry. See trace.ts for the shapes.
// Calls run one at a time here, so a person is never asked two questions at once.
import OpenAI from 'openai'
import { guardedCall } from './guard.ts'
import type { Registry } from './registry.ts'
import { registry as shopRegistry } from './tools.ts'
import type { Confirm, TraceEntry } from './trace.ts'

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
  confirm?: Confirm
}

export interface AgentResult {
  answer: string
  trace: TraceEntry[]
}

const refuseAll: Confirm = () => false

export function toolSpecs(registry: Registry): OpenAI.Chat.ChatCompletionFunctionTool[] {
  return Object.entries(registry).map(([name, tool]) => ({
    type: 'function',
    function: { name, description: tool.description, parameters: tool.parameters }
  }))
}

export async function runAgent(
  question: string,
  { client = new OpenAI(), maxSteps = 8, registry = shopRegistry, confirm = refuseAll }: AgentOptions = {}
): Promise<AgentResult> {
  throw new Error('Not implemented')
}
