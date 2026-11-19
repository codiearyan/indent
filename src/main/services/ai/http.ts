import Anthropic from '@anthropic-ai/sdk'
import type { AiMessage } from '@shared/types'
import { openAiDelta, sseParser } from './parsers'

export interface HttpRun {
  key: string
  model: string
  system: string
  messages: AiMessage[]
  /** Small and fast for inline suggestions. */
  quick: boolean
  signal: AbortSignal
  onDelta(text: string): void
}

// These models refuse some requests by policy; the API then retries on a fallback model itself.
const FALLBACK_MODELS = new Set(['claude-fable-5-2', 'claude-opus-5-5', 'claude-sonnet-5-5'])

export async function anthropicStream(run: HttpRun): Promise<void> {
  const client = new Anthropic({ apiKey: run.key, maxRetries: 1 })
  try {
    const stream = client.beta.messages.stream(
      {
        model: run.model,
        max_tokens: run.quick ? 2048 : 16000,
        system: run.system,
        messages: run.messages,
        ...(run.quick ? { output_config: { effort: 'low' as const } } : {}),
        ...(FALLBACK_MODELS.has(run.model)
          ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
          : {})
      },
      { signal: run.signal }
    )
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        run.onDelta(event.delta.text)
      }
    }
    const message = await stream.finalMessage()
    if (message.stop_reason === 'refusal') throw new Error('The model declined to answer this one.')
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new Error('Anthropic did not accept this key.', { cause: error })
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new Error('Anthropic is rate limiting this key. Try again in a moment.', {
        cause: error
      })
    }
    throw error
  }
}

export const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
export const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'

function httpError(status: number, body: string): string {
  if (status === 401 || status === 403) return 'The provider did not accept this key.'
  if (status === 429) return 'The provider is rate limiting this key. Try again in a moment.'
  try {
    const parsed = JSON.parse(body)
    const message = (Array.isArray(parsed) ? parsed[0] : parsed)?.error?.message
    if (typeof message === 'string') return message
  } catch {
    // not JSON
  }
  return `The provider answered with HTTP ${status}.`
}

/** OpenAI and Gemini (through its OpenAI-compatible endpoint) stream chat completions as SSE. */
export async function openAiCompatibleStream(url: string, run: HttpRun): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${run.key}` },
    body: JSON.stringify({
      model: run.model,
      stream: true,
      messages: [{ role: 'system', content: run.system }, ...run.messages]
    }),
    signal: run.signal
  })
  if (!response.ok || !response.body) {
    throw new Error(httpError(response.status, await response.text()))
  }
  let failure: string | undefined
  const push = sseParser((data) => {
    const { delta, error } = openAiDelta(data)
    if (delta) run.onDelta(delta)
    if (error) failure ??= error
  })
  const decoder = new TextDecoder()
  for await (const chunk of response.body) push(decoder.decode(chunk, { stream: true }))
  push('\n\n')
  if (failure) throw new Error(failure)
}
