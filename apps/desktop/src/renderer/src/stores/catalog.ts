import { create } from 'zustand'
import type { InstallFailure, LabSummary, PathDef } from '@shared/types'
import { api } from '@/lib/api'
import { track } from '@/lib/telemetry'

export type Download =
  { state: 'running'; done: number } | { state: 'failed'; reason: InstallFailure; message: string }

interface CatalogStore {
  labs: LabSummary[] | null
  paths: PathDef[] | null
  /** Set when the repos could not be read at all. */
  error: boolean
  /** Repos being downloaded from the library, or whose last download failed. */
  downloads: Record<string, Download>
  /** Loads once; the main process says when the list changes. */
  load(): Promise<void>
  /** Downloads a repo from the library; false when it failed (see `downloads`). */
  download(labId: string): Promise<boolean>
}

async function fetchCatalog(): Promise<Pick<CatalogStore, 'labs' | 'paths'>> {
  const [labs, paths] = await Promise.all([api.content.listLabs(), api.content.listPaths()])
  return { labs, paths }
}

export const useCatalog = create<CatalogStore>()((set, get) => {
  const setDownload = (labId: string, download?: Download): void =>
    set((s) => {
      const downloads = { ...s.downloads }
      if (download) downloads[labId] = download
      else delete downloads[labId]
      return { downloads }
    })

  return {
    labs: null,
    paths: null,
    error: false,
    downloads: {},

    load: async () => {
      if (get().labs) return
      set({ error: false })
      try {
        set(await fetchCatalog())
      } catch (error) {
        console.error('Could not load the repos:', error)
        set({ error: true })
      }
    },

    download: async (labId) => {
      setDownload(labId, { state: 'running', done: 0 })
      const result = await api.content.install(labId)
      if (result.ok) {
        track('repo_downloaded', { repo: labId })
        setDownload(labId)
        return true
      }
      track('repo_download_failed', { repo: labId, reason: result.reason })
      setDownload(labId, { state: 'failed', reason: result.reason, message: result.message })
      return false
    }
  }
})

api.content.onInstallProgress((labId, done) => {
  if (useCatalog.getState().downloads[labId]?.state !== 'running') return
  useCatalog.setState((s) => ({
    downloads: { ...s.downloads, [labId]: { state: 'running', done } }
  }))
})

// A newer library index, a download or a quiet update changed the repos or roadmaps.
api.content.onChanged(() => {
  if (useCatalog.getState().labs) {
    void fetchCatalog().then((catalog) => useCatalog.setState(catalog))
  }
})
