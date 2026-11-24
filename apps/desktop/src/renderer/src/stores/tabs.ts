import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StoredTabs } from '@/features/editor/layout'

interface TabsState {
  /** Open tabs and the split by `labId/chapterId`. */
  byChapter: Record<string, StoredTabs>
  /** Expanded folders of the files panel by `labId/chapterId`. */
  expandedByChapter: Record<string, string[]>
  /** The lesson heading last read by `labId/chapterId`. */
  lessonPartByChapter: Record<string, string>
  remember(key: string, tabs: StoredTabs): void
  rememberExpanded(key: string, folders: string[]): void
  rememberLessonPart(key: string, part: string | null): void
}

export const useOpenTabs = create<TabsState>()(
  persist(
    (set, get) => ({
      byChapter: {},
      expandedByChapter: {},
      lessonPartByChapter: {},
      remember: (key, tabs) => set((s) => ({ byChapter: { ...s.byChapter, [key]: tabs } })),
      rememberExpanded: (key, folders) =>
        set((s) => ({ expandedByChapter: { ...s.expandedByChapter, [key]: folders } })),
      rememberLessonPart: (key, part) => {
        if ((get().lessonPartByChapter[key] ?? null) === part) return
        set((s) => {
          const lessonPartByChapter = { ...s.lessonPartByChapter }
          if (part) lessonPartByChapter[key] = part
          else delete lessonPartByChapter[key]
          return { lessonPartByChapter }
        })
      }
    }),
    { name: 'indent-tabs', version: 1 }
  )
)
