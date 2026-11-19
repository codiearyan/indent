import type { AiConfig } from '@shared/types'

export type AiSettings = Pick<AiConfig, 'enabled' | 'provider' | 'model' | 'suggestions'>

/** Reads ai.json as saved by any earlier version; missing fields get their defaults. */
export function readSettings(saved: unknown): AiSettings {
  const s = (saved && typeof saved === 'object' ? saved : {}) as Record<string, unknown>
  return {
    enabled: s.enabled !== false,
    provider: (s.provider as AiSettings['provider']) ?? null,
    model: typeof s.model === 'string' ? s.model : null,
    suggestions: s.suggestions === true
  }
}
