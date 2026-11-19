import { create } from 'zustand'
import type { ChapterProgress, ProgressState } from '@shared/types'
import { chapterKey } from '@shared/rules'
import { api } from '@/lib/api'

interface ProgressStore {
  progress: ProgressState | null
  load(): Promise<void>
  /** Every mutating api call returns the new state; hand it here. */
  set(progress: ProgressState): void
}

export const useProgress = create<ProgressStore>()((set) => ({
  progress: null,
  load: async () => set({ progress: await api.progress.get() }),
  set: (progress) => set({ progress })
}))

export function useChapterProgress(labId: string, chapterId: string): ChapterProgress | undefined {
  return useProgress((s) => s.progress?.chapters[chapterKey(labId, chapterId)])
}
