import { create } from 'zustand'
import type { AiConfig, AiProviderId, AiProviderInfo, AiSettingsPatch } from '@shared/types'
import { api } from '@/lib/api'

interface AiStore {
  config: AiConfig | null
  load(): Promise<void>
  update(patch: AiSettingsPatch): Promise<void>
  setKey(provider: AiProviderId, key: string | null): Promise<void>
}

export const useAi = create<AiStore>()((set) => ({
  config: null,
  load: async () => set({ config: await api.ai.getConfig() }),
  // Shown at once: the reply can wait seconds behind the search for installed CLIs.
  update: async (patch) => {
    set((s) => (s.config ? { config: { ...s.config, ...patch } } : s))
    try {
      set({ config: await api.ai.setConfig(patch) })
    } catch (error) {
      set({ config: await api.ai.getConfig() })
      throw error
    }
  },
  setKey: async (provider, key) => set({ config: await api.ai.setKey(provider, key) })
}))

/** True until the config says otherwise, so the tutor does not flicker in while it loads. */
export function useAiEnabled(): boolean {
  return useAi((s) => s.config?.enabled ?? true)
}

export function activeProvider(config: AiConfig | null): AiProviderInfo | undefined {
  return config?.providers.find((p) => p.id === config.provider)
}

void useAi.getState().load()
