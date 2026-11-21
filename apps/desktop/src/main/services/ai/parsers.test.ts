import { describe, expect, it } from 'vitest'
import { lineSplitter, openAiDelta, opencodeLogError, parseCliLine, sseParser } from './parsers'

// Lines trimmed from real runs of each CLI.
describe('parseCliLine', () => {
  it('reads Claude Code text deltas and the final result', () => {
    const delta = JSON.stringify({
      type: 'stream_event',
      event: { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'ok' } }
    })
    const thinking = JSON.stringify({
      type: 'stream_event',
      event: { type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'x' } }
    })
    expect(parseCliLine('claude-code', delta)).toEqual({ delta: 'ok' })
    expect(parseCliLine('claude-code', thinking)).toEqual({})
    expect(
      parseCliLine(
        'claude-code',
        '{"type":"result","subtype":"success","is_error":false,"result":"ok"}'
      )
    ).toEqual({ final: 'ok' })
    expect(
      parseCliLine('claude-code', '{"type":"result","is_error":true,"result":"Not logged in"}')
    ).toEqual({ error: 'Not logged in' })
  })

  it('reads Codex agent messages and failures', () => {
    expect(
      parseCliLine(
        'codex',
        '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"ok"}}'
      )
    ).toEqual({ delta: 'ok' })
    expect(parseCliLine('codex', '{"type":"turn.started"}')).toEqual({})
    expect(parseCliLine('codex', '{"type":"turn.failed","error":{"message":"quota"}}')).toEqual({
      error: 'quota'
    })
  })

  it('reads OpenCode text parts and errors', () => {
    expect(
      parseCliLine('opencode', '{"type":"text","part":{"type":"text","text":"ok","time":{}}}')
    ).toEqual({ delta: 'ok' })
    expect(parseCliLine('opencode', '{"type":"step_finish","part":{"reason":"stop"}}')).toEqual({})
    expect(
      parseCliLine(
        'opencode',
        '{"type":"error","error":{"name":"APIError","data":{"message":"no auth"}}}'
      )
    ).toEqual({ error: 'no auth' })
  })

  it('reads Gemini CLI assistant chunks and ignores warnings', () => {
    expect(
      parseCliLine(
        'gemini-cli',
        '{"type":"message","role":"assistant","content":"ok","delta":true}'
      )
    ).toEqual({ delta: 'ok' })
    expect(parseCliLine('gemini-cli', '{"type":"message","role":"user","content":"hi"}')).toEqual(
      {}
    )
    expect(parseCliLine('gemini-cli', '{"type":"error","message":"warn"}')).toEqual({})
    expect(
      parseCliLine('gemini-cli', '{"type":"result","status":"error","error":{"message":"bad"}}')
    ).toEqual({ error: 'bad' })
  })

  it('ignores lines that are not JSON', () => {
    expect(parseCliLine('codex', 'Reading prompt from stdin...')).toEqual({})
    expect(parseCliLine('codex', '')).toEqual({})
  })
})

describe('lineSplitter', () => {
  it('joins lines split across chunks', () => {
    const lines: string[] = []
    const push = lineSplitter((l) => lines.push(l))
    push('{"a":')
    push('1}\r\n{"b"')
    push(':2}\n')
    expect(lines).toEqual(['{"a":1}', '{"b":2}'])
  })
})

describe('sse', () => {
  it('emits each event once complete, across chunk boundaries', () => {
    const events: string[] = []
    const push = sseParser((d) => events.push(d))
    push('data: {"choices":[{"delta":{"content":"Hel"}}]}\n\nda')
    push('ta: {"choices":[{"delta":{"content":"lo"}}]}\n')
    expect(events).toHaveLength(1)
    push('\n: keep-alive\n\ndata: [DONE]\n\n')
    expect(events.map(openAiDelta)).toEqual([{ delta: 'Hel' }, { delta: 'lo' }, {}])
  })

  it('reads errors sent inside the stream', () => {
    expect(openAiDelta('{"error":{"message":"overloaded"}}')).toEqual({ error: 'overloaded' })
    expect(openAiDelta('{"choices":[{"delta":{"role":"assistant"}}]}')).toEqual({
      delta: undefined
    })
  })
})

// Trimmed from the line a real run printed with `--print-logs` when the free limit was reached.
const LIMIT_LOG =
  'timestamp=2026-11-21T20:31:23.857Z level=ERROR run=56b2d686 message="stream error" providerID=opencode modelID=big-pickle session.id=ses_e00319d4 small=false agent=build mode=primary error.error="AI_APICallError: Free usage limit reached."'

describe('opencodeLogError', () => {
  it('reads the reason OpenCode logged for a reply that failed', () => {
    expect(opencodeLogError(LIMIT_LOG)).toBe('Free usage limit reached.')
  })

  it('keeps a reason that has no error class in front and reads its quotes', () => {
    const line =
      'level=ERROR message="stream error" small=false error.error="Model \\"x/y\\" is not available"'
    expect(opencodeLogError(line)).toBe('Model "x/y" is not available')
  })

  it('ignores an error of the small model that only names the session', () => {
    expect(
      opencodeLogError(LIMIT_LOG.replace('small=false agent=build', 'small=true agent=title'))
    ).toBeUndefined()
  })

  it('ignores other log lines and plain text', () => {
    expect(
      opencodeLogError('timestamp=2026-11-21T20:31:19.5Z level=WARN message="server unavailable"')
    ).toBeUndefined()
    expect(opencodeLogError('Error: something else')).toBeUndefined()
  })
})
