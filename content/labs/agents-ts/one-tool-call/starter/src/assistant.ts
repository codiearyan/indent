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
  throw new Error('Not implemented')
}

export async function requestToolCall(
  question: string,
  client: OpenAI = new OpenAI()
): Promise<ToolRequest> {
  throw new Error('Not implemented')
}

export async function askAboutOrder(question: string, client: OpenAI = new OpenAI()): Promise<string> {
  throw new Error('Not implemented')
}
