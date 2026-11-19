import type { AiConfig, SuggestionMode } from '@shared/types'

export type AiSettings = Pick<AiConfig, 'enabled' | 'provider' | 'model' | 'suggestions' | 'nudge'>

/** Reads ai.json as saved by any earlier version; missing fields get their defaults. */
export function readSettings(saved: unknown): AiSettings {
  const s = (saved && typeof saved === 'object' ? saved : {}) as Record<string, unknown>
  return {
    enabled: s.enabled !== false,
    provider: (s.provider as AiSettings['provider']) ?? null,
    model: typeof s.model === 'string' ? s.model : null,
    suggestions: suggestionMode(s.suggestions),
    nudge: s.nudge !== false
  }
}

const MODES: SuggestionMode[] = ['off', 'manual', 'auto']

/** Suggestions were a boolean before they had modes: true meant what `auto` does now. */
export function suggestionMode(value: unknown): SuggestionMode {
  if (value === true) return 'auto'
  return MODES.includes(value as SuggestionMode) ? (value as SuggestionMode) : 'off'
}

/** The stored keys after saving `key` for `provider`; a blank or missing key removes it. */
export function withKey<K extends string>(
  stored: Partial<Record<K, string>>,
  provider: K,
  key: unknown
): Partial<Record<K, string>> {
  const next = { ...stored }
  const trimmed = typeof key === 'string' ? key.trim() : ''
  // A key travels in a request header, where anything else fails with the key in the error.
  if (trimmed && !/^[\x21-\x7e]+$/.test(trimmed)) throw new Error('That is not an API key.')
  if (trimmed) next[provider] = trimmed
  else delete next[provider]
  return next
}
