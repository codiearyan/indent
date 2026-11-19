// Tasks 1 and 2: check what the model sends before you run anything.
//
// 1. parseArguments(tool, raw): parse the model's JSON arguments and check them against the tool's
//    parameters. Return { ok: true, args } or { ok: false, error } with an error that names the problem.
// 2. executeToolCall(registry, name, raw): run one tool call and always return the tool message
//    content as JSON text. Unknown tools, invalid arguments and tools that throw become
//    { "error": "..." } instead of crashing the run.

export type PropertySchema = {
  type: 'string' | 'number' | 'integer' | 'boolean'
  description?: string
}

export type ParameterSchema = {
  type: 'object'
  properties: Record<string, PropertySchema>
  required: string[]
}

export type ToolArgs = Record<string, unknown>

export interface ToolDef {
  description: string
  parameters: ParameterSchema
  run: (args: ToolArgs) => unknown
}

export type Registry = Record<string, ToolDef>

export type ParseResult = { ok: true; args: ToolArgs } | { ok: false; error: string }

export function parseArguments(tool: ToolDef, raw: string): ParseResult {
  throw new Error('Not implemented')
}

export async function executeToolCall(registry: Registry, name: string, raw: string): Promise<string> {
  throw new Error('Not implemented')
}
