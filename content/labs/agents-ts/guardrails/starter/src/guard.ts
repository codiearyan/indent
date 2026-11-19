// Task 1: ask before acting.
//
// guardedCall(registry, name, raw, confirm): run one tool call like executeToolCall, except that a
// tool marked needsConfirmation only runs after confirm({ name, args }) approves it, with args
// parsed. Without approval, the tool does not run and the content tells the model it was refused:
// a JSON object with refused: true and a reason. Tools without the flag never ask. Invalid
// arguments are reported as usual, without asking.
import { executeToolCall, parseArguments, type Registry } from './registry.ts'
import type { Confirm } from './trace.ts'

export interface GuardedResult {
  content: string
  refused: boolean
}

export async function guardedCall(
  registry: Registry,
  name: string,
  raw: string,
  confirm: Confirm
): Promise<GuardedResult> {
  throw new Error('Not implemented')
}
