import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OpenTabs } from '@/features/editor/tabs'

interface TabsState {
  /** Open tabs by `labId/chapterId`. */
  byChapter: Record<string, OpenTabs>
  remember(key: string, tabs: OpenTabs): void
}

export const useOpenTabs = create<TabsState>()(
  persist(
    (set) => ({
      byChapter: {},
      remember: (key, tabs) => set((s) => ({ byChapter: { ...s.byChapter, [key]: tabs } }))
    }),
    { name: 'indent-tabs', version: 1 }
  )
)
