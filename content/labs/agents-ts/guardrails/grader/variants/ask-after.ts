import { executeToolCall, type Registry } from './registry.ts'
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
  const content = await executeToolCall(registry, name, raw)
  const tool = registry[name]
  if (tool?.needsConfirmation && !(await confirm({ name, args: JSON.parse(raw) }))) {
    return { content: JSON.stringify({ refused: true, reason: `${name} was not approved` }), refused: true }
  }
  return { content, refused: false }
}
