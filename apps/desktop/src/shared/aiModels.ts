import type { AiConfig, AiProviderInfo } from './types'

/** OpenCode's own free models: the only ones its app copy can use without a sign-in. */
export const isFreeOpencodeModel = (model: string): boolean =>
  /^opencode\/[\w.-]+-free$/.test(model)

/**
 * The model to try after `current` failed, or null when the provider has no other. An API provider
 * without a pick uses its first model, so that one counts as tried.
 */
export function nextModel(provider: AiProviderInfo, current: string | null): string | null {
  const models = provider.managed ? provider.models.filter(isFreeOpencodeModel) : provider.models
  const tried = current ?? (provider.kind === 'api' ? (models[0] ?? null) : null)
  const next = models[(models.indexOf(tried ?? '') + 1) % models.length]
  return next && next !== tried ? next : null
}

/** The providers that work on this computer, other than the one in use. */
export function otherProviders(config: AiConfig | null): AiProviderInfo[] {
  return config?.providers.filter((p) => p.available && p.id !== config.provider) ?? []
}
