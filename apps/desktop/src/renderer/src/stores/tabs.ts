import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StoredTabs } from '@/features/editor/layout'

interface TabsState {
  /** Open tabs and the split by `labId/chapterId`. */
  byChapter: Record<string, StoredTabs>
  /** Expanded folders of the files panel by `labId/chapterId`. */
  expandedByChapter: Record<string, string[]>
  remember(key: string, tabs: StoredTabs): void
  rememberExpanded(key: string, folders: string[]): void
}

export const useOpenTabs = create<TabsState>()(
  persist(
    (set) => ({
      byChapter: {},
      expandedByChapter: {},
      remember: (key, tabs) => set((s) => ({ byChapter: { ...s.byChapter, [key]: tabs } })),
      rememberExpanded: (key, folders) =>
        set((s) => ({ expandedByChapter: { ...s.expandedByChapter, [key]: folders } }))
    }),
    { name: 'indent-tabs', version: 1 }
  )
)
