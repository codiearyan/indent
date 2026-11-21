// The tool registry from the last issue: validated arguments, and errors returned as results.
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

function hasType(type: PropertySchema['type'], value: unknown): boolean {
  if (type === 'integer') return Number.isInteger(value)
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value)
  return typeof value === type
}

export function parseArguments(tool: ToolDef, raw: string): ParseResult {
  let args: unknown
  try {
    args = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'The arguments are not valid JSON.' }
  }
  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    return { ok: false, error: 'The arguments must be a JSON object.' }
  }
  const { properties, required } = tool.parameters
  const missing = required.find((key) => !Object.hasOwn(args, key))
  if (missing) return { ok: false, error: `Missing required argument ${missing}.` }
  for (const [key, value] of Object.entries(args)) {
    if (!Object.hasOwn(properties, key)) return { ok: false, error: `Unknown argument ${key}.` }
    const { type } = properties[key]
    if (!hasType(type, value)) {
      return { ok: false, error: `Argument ${key} must be of type ${type}, got ${JSON.stringify(value)}.` }
    }
  }
  return { ok: true, args: args as ToolArgs }
}

const failure = (error: string): string => JSON.stringify({ error })

export async function executeToolCall(registry: Registry, name: string, raw: string): Promise<string> {
  if (!Object.hasOwn(registry, name)) {
    return failure(`Unknown tool ${name}. Available tools: ${Object.keys(registry).join(', ')}.`)
  }
  const parsed = parseArguments(registry[name], raw)
  if (!parsed.ok) return failure(`Invalid arguments for ${name}: ${parsed.error}`)
  try {
    return JSON.stringify((await registry[name].run(parsed.args)) ?? null)
  } catch (err) {
    return failure(`${name} failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}
