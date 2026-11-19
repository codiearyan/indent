// Tasks 1 and 2: run the tool calls of one reply at the same time.
//
// runToolCalls(registry, calls): start every call with executeToolCall without waiting for the
// others, and return one tool message per call. The messages come back in the order of the calls,
// each answering its own call id, however the calls happen to finish.
import OpenAI from 'openai'
import { executeToolCall, type Registry } from './registry.ts'

type ToolCall = OpenAI.Chat.ChatCompletionMessageFunctionToolCall
type ToolMessage = OpenAI.Chat.ChatCompletionToolMessageParam

export async function runToolCalls(registry: Registry, calls: ToolCall[]): Promise<ToolMessage[]> {
  return Promise.all(
    calls.map(async (call): Promise<ToolMessage> => ({
      role: 'tool',
      tool_call_id: call.id,
      content: await executeToolCall(registry, call.function.name, call.function.arguments)
    }))
  )
}
