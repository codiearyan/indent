import { create } from 'zustand'
import type { LabSummary, PathDef } from '@shared/types'
import { api } from '@/lib/api'

interface CatalogStore {
  labs: LabSummary[] | null
  paths: PathDef[] | null
  /** Loads once; the main process says when the list changes. */
  load(): Promise<void>
}

async function fetchCatalog(): Promise<Pick<CatalogStore, 'labs' | 'paths'>> {
  const [labs, paths] = await Promise.all([api.content.listLabs(), api.content.listPaths()])
  return { labs, paths }
}

export const useCatalog = create<CatalogStore>()((set, get) => ({
  labs: null,
  paths: null,
  load: async () => {
    if (get().labs) return
    set(await fetchCatalog())
  }
}))

// A newer library index, a download or a quiet update changed the repos or roadmaps.
api.content.onChanged(() => {
  if (useCatalog.getState().labs)
    void fetchCatalog().then((catalog) => useCatalog.setState(catalog))
})
