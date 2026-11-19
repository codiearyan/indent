// What a run did, step by step, in the order it happened.
export type TraceEntry =
  | { type: 'model'; step: number; content: string | null; toolCalls: string[] }
  | { type: 'tool_call'; id: string; name: string; arguments: string }
  | { type: 'tool_result'; id: string; content: string }
  | { type: 'refused'; id: string; name: string }

export interface ConfirmRequest {
  name: string
  args: Record<string, unknown>
}

// Asked before a tool marked needsConfirmation runs. true means go ahead.
export type Confirm = (request: ConfirmRequest) => boolean | Promise<boolean>
