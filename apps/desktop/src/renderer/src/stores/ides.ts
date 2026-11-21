import { create } from 'zustand'
import type { IdeInfo } from '@shared/types'
import { api } from '@/lib/api'
import { useSettings } from './settings'

interface IdeStore {
  /** The IDEs found on this computer; null until looked for. */
  ides: IdeInfo[] | null
  load(): Promise<void>
}

export const useIdes = create<IdeStore>()((set) => ({
  ides: null,
  load: async () => set({ ides: await api.ide.list() })
}))

/** The IDE issues open in: the one picked in Settings while it is installed, else the first found. */
export function useIde(): IdeInfo | undefined {
  const ides = useIdes((s) => s.ides)
  const picked = useSettings((s) => s.ide)
  return ides?.find((ide) => ide.id === picked) ?? ides?.[0]
}

void useIdes.getState().load()
