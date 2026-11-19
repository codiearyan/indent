import { create } from 'zustand'
import type { AiConfig, AiProviderId, AiProviderInfo, AiSettingsPatch } from '@shared/types'
import { api } from '@/lib/api'

interface AiStore {
  config: AiConfig | null
  /** The AI menu popover; other components open it with `openMenu()`. */
  menuOpen: boolean
  load(): Promise<void>
  update(patch: AiSettingsPatch): Promise<void>
  setKey(provider: AiProviderId, key: string | null): Promise<void>
  setMenuOpen(open: boolean): void
  openMenu(): void
}

export const useAi = create<AiStore>()((set) => ({
  config: null,
  menuOpen: false,
  load: async () => set({ config: await api.ai.getConfig() }),
  update: async (patch) => set({ config: await api.ai.setConfig(patch) }),
  setKey: async (provider, key) => set({ config: await api.ai.setKey(provider, key) }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  openMenu: () => set({ menuOpen: true })
}))

export function activeProvider(config: AiConfig | null): AiProviderInfo | undefined {
  return config?.providers.find((p) => p.id === config.provider)
}

void useAi.getState().load()
