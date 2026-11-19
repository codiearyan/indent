import { create } from 'zustand'
import type { LabSummary, PathDef } from '@shared/types'
import { api } from '@/lib/api'

interface CatalogStore {
  labs: LabSummary[] | null
  paths: PathDef[] | null
  /** Loads once; content does not change while the app runs. */
  load(): Promise<void>
}

export const useCatalog = create<CatalogStore>()((set, get) => ({
  labs: null,
  paths: null,
  load: async () => {
    if (get().labs) return
    const [labs, paths] = await Promise.all([api.content.listLabs(), api.content.listPaths()])
    set({ labs, paths })
  }
}))
