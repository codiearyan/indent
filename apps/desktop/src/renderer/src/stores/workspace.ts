import { create } from 'zustand'
import type { Chapter, CheckResult, WorkspaceFile } from '@shared/types'
import { api } from '@/lib/api'
import { useProgress } from './progress'
import { useSettings } from './settings'

const SAVE_DELAY_MS = 400

interface WorkspaceStore {
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  chapter: Chapter | null
  /** Absolute workspace folder on disk. */
  dir: string
  files: WorkspaceFile[]
  activePath: string | null
  /** Task ids being checked right now, or null. */
  checking: string[] | null
  tourOpen: boolean

  open(labId: string, chapterId: string): Promise<void>
  setActive(path: string): void
  /** Updates the buffer and saves to disk after a short pause. */
  edit(path: string, content: string): void
  /** Writes pending edits now. */
  flush(): Promise<void>
  /** Re-reads files from disk, for changes made in the terminal. */
  refresh(): Promise<void>
  /** Restores the starter files. */
  reset(): Promise<void>
  /** Runs the hidden tests for some tasks, or all. */
  check(taskIds?: string[]): Promise<CheckResult[]>
  setTourOpen(open: boolean): void
}

const pendingSaves = new Map<string, ReturnType<typeof setTimeout>>()

export const useWorkspace = create<WorkspaceStore>()((set, get) => {
  const ids = (): [string, string] => {
    const chapter = get().chapter
    if (!chapter) throw new Error('No issue is open')
    return [chapter.labId, chapter.id]
  }

  const save = (path: string): Promise<void> => {
    clearTimeout(pendingSaves.get(path))
    pendingSaves.delete(path)
    const file = get().files.find((f) => f.path === path)
    return file ? api.workspace.writeFile(...ids(), path, file.content) : Promise.resolve()
  }

  const applySnapshot = (files: WorkspaceFile[], dir: string): void => {
    const { activePath, chapter } = get()
    const stillThere = files.some((f) => f.path === activePath)
    set({
      files,
      dir,
      activePath: stillThere ? activePath : (chapter?.files[0] ?? files[0]?.path ?? null)
    })
  }

  return {
    status: 'idle',
    error: null,
    chapter: null,
    dir: '',
    files: [],
    activePath: null,
    checking: null,
    tourOpen: false,

    open: async (labId, chapterId) => {
      await get().flush()
      set({ status: 'loading', error: null, chapter: null, files: [], activePath: null })
      try {
        const [chapter, snapshot, progress] = await Promise.all([
          api.content.getChapter(labId, chapterId),
          api.workspace.open(labId, chapterId),
          api.progress.touch(labId, chapterId)
        ])
        useProgress.getState().set(progress)
        set({ chapter, status: 'ready' })
        applySnapshot(snapshot.files, snapshot.dir)
      } catch (error) {
        set({ status: 'error', error: error instanceof Error ? error.message : String(error) })
      }
    },

    setActive: (activePath) => set({ activePath }),

    edit: (path, content) => {
      set((s) => ({ files: s.files.map((f) => (f.path === path ? { ...f, content } : f)) }))
      clearTimeout(pendingSaves.get(path))
      pendingSaves.set(
        path,
        setTimeout(() => void save(path), SAVE_DELAY_MS)
      )
    },

    flush: async () => {
      await Promise.all([...pendingSaves.keys()].map(save))
    },

    refresh: async () => {
      if (!get().chapter || pendingSaves.size > 0) return
      const snapshot = await api.workspace.open(...ids())
      if (pendingSaves.size === 0) applySnapshot(snapshot.files, snapshot.dir)
    },

    reset: async () => {
      for (const timer of pendingSaves.values()) clearTimeout(timer)
      pendingSaves.clear()
      const snapshot = await api.workspace.reset(...ids())
      applySnapshot(snapshot.files, snapshot.dir)
    },

    check: async (taskIds) => {
      const chapter = get().chapter
      if (!chapter || get().checking) return []
      set({ checking: taskIds ?? chapter.tasks.map((t) => t.id) })
      try {
        await get().flush()
        const { results, progress } = await api.checks.run(chapter.labId, chapter.id, taskIds)
        useProgress.getState().set(progress)
        useSettings.getState().setLeftTab('tasks')
        return results
      } finally {
        set({ checking: null })
      }
    },

    setTourOpen: (tourOpen) => set({ tourOpen })
  }
})
