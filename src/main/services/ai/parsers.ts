import type { AiProviderId } from '@shared/types'

export type CliProviderId = Extract<
  AiProviderId,
  'claude-code' | 'codex' | 'opencode' | 'gemini-cli'
>

/** What one JSONL line of a CLI's output means for the reply. */
export interface CliLine {
  delta?: string
  error?: string
  /** The whole reply, used only when nothing streamed. */
  final?: string
}

type Json = Record<string, unknown>

function parseJson(line: string): Json | null {
  try {
    const value = JSON.parse(line)
    return value && typeof value === 'object' ? (value as Json) : null
  } catch {
    return null
  }
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function obj(value: unknown): Json {
  return value && typeof value === 'object' ? (value as Json) : {}
}

/** `claude -p --output-format stream-json --verbose --include-partial-messages` */
function claudeLine(event: Json): CliLine {
  if (event.type === 'stream_event') {
    const inner = obj(event.event)
    const delta = obj(inner.delta)
    if (inner.type === 'content_block_delta' && delta.type === 'text_delta') {
      return { delta: text(delta.text) }
    }
  }
  if (event.type === 'result') {
    const result = text(event.result) ?? ''
    return event.is_error
      ? { error: result || 'Claude Code stopped with an error.' }
      : { final: result }
  }
  return {}
}

/** `codex exec --json`: one agent message per completed item, no partial text. */
function codexLine(event: Json): CliLine {
  const item = obj(event.item)
  if (event.type === 'item.completed' && item.type === 'agent_message') {
    return { delta: text(item.text) }
  }
  if (event.type === 'turn.failed')
    return { error: text(obj(event.error).message) ?? 'Codex failed.' }
  if (event.type === 'error') return { error: text(event.message) ?? 'Codex failed.' }
  return {}
}

/** `opencode run --format json`: a text event per finished text part. */
function opencodeLine(event: Json): CliLine {
  if (event.type === 'text') return { delta: text(obj(event.part).text) }
  if (event.type === 'error') {
    const error = obj(event.error)
    return {
      error:
        text(obj(error.data).message) ??
        text(error.message) ??
        text(error.name) ??
        'OpenCode failed.'
    }
  }
  return {}
}

/** `gemini --output-format stream-json`; its `error` events are non-fatal warnings. */
function geminiLine(event: Json): CliLine {
  if (event.type === 'message' && event.role === 'assistant') return { delta: text(event.content) }
  if (event.type === 'result' && event.status === 'error') {
    return { error: text(obj(event.error).message) ?? 'Gemini CLI failed.' }
  }
  return {}
}

const lineParsers: Record<CliProviderId, (event: Json) => CliLine> = {
  'claude-code': claudeLine,
  codex: codexLine,
  opencode: opencodeLine,
  'gemini-cli': geminiLine
}

export function parseCliLine(provider: CliProviderId, line: string): CliLine {
  const event = parseJson(line.trim())
  return event ? lineParsers[provider](event) : {}
}

/** Splits a text stream into complete lines; keeps the unfinished tail for the next chunk. */
export function lineSplitter(onLine: (line: string) => void): (chunk: string) => void {
  let buffer = ''
  return (chunk) => {
    buffer += chunk
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''
    for (const line of lines) onLine(line)
  }
}

/** Server-sent events: calls onData with each event's joined `data:` lines. */
export function sseParser(onData: (data: string) => void): (chunk: string) => void {
  let data: string[] = []
  return lineSplitter((line) => {
    if (line === '') {
      if (data.length) onData(data.join('\n'))
      data = []
    } else if (line.startsWith('data:')) {
      data.push(line.slice(5).replace(/^ /, ''))
    }
  })
}

/** One `data:` payload of an OpenAI-style chat completions stream. */
export function openAiDelta(data: string): CliLine {
  if (data === '[DONE]') return {}
  const event = parseJson(data)
  if (!event) return {}
  if (event.error)
    return { error: text(obj(event.error).message) ?? 'The provider returned an error.' }
  const choice = obj((event.choices as unknown[] | undefined)?.[0])
  return { delta: text(obj(choice.delta).content) }
}
