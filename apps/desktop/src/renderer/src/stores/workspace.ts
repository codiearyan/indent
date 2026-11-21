import { create } from 'zustand'
import type {
  Chapter,
  CheckResult,
  ProgressState,
  WorkspaceFile,
  WorkspaceSnapshot
} from '@shared/types'
import { chapterKey, hintsUnlocked } from '@shared/rules'
import { api } from '@/lib/api'
import { track } from '@/lib/telemetry'
import { useProgress } from './progress'
import { useSettings } from './settings'

const SAVE_DELAY_MS = 400

/** True right after the first issue of a repo was opened for the first time. */
function repoJustStarted(progress: ProgressState, labId: string, chapterId: string): boolean {
  const opened = Object.keys(progress.chapters).filter((key) => key.startsWith(`${labId}/`))
  const entry = progress.chapters[chapterKey(labId, chapterId)]
  return opened.length === 1 && entry?.startedAt === entry?.lastOpenedAt
}

interface WorkspaceStore {
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  chapter: Chapter | null
  /** Absolute workspace folder on disk. */
  dir: string
  files: WorkspaceFile[]
  /** Starter content by path; a file that differs from it, or has none, counts as edited. */
  starter: Record<string, string>
  activePath: string | null
  /** Counts writes to disk, so the Browser panel knows when to reload. */
  revision: number
  /** Task ids being checked right now, or null. */
  checking: string[] | null
  /** Counts presses of Run; the terminal runs the issue's command on each change. */
  runs: number
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
  /** Saves, then runs the issue's suggested command in the terminal. */
  run(): Promise<void>
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
    if (!file) return Promise.resolve()
    return api.workspace
      .writeFile(...ids(), path, file.content)
      .then(() => set((s) => ({ revision: s.revision + 1 })))
  }

  const applySnapshot = ({ files, dir, starter }: WorkspaceSnapshot): void => {
    const { activePath, chapter } = get()
    const stillThere = files.some((f) => f.path === activePath)
    set({
      files,
      dir,
      starter,
      activePath: stillThere
        ? activePath
        : (chapter?.files.find((path) => files.some((f) => f.path === path)) ??
          files[0]?.path ??
          null)
    })
  }

  return {
    status: 'idle',
    error: null,
    chapter: null,
    dir: '',
    files: [],
    starter: {},
    activePath: null,
    revision: 0,
    checking: null,
    runs: 0,
    tourOpen: false,

    open: async (labId, chapterId) => {
      await get().flush()
      set({
        status: 'loading',
        error: null,
        chapter: null,
        files: [],
        starter: {},
        activePath: null
      })
      try {
        const [chapter, snapshot, progress] = await Promise.all([
          api.content.getChapter(labId, chapterId),
          api.workspace.open(labId, chapterId),
          api.progress.touch(labId, chapterId)
        ])
        useProgress.getState().set(progress)
        if (repoJustStarted(progress, labId, chapterId)) track('repo_started', { repo: labId })
        set({ chapter, status: 'ready' })
        applySnapshot(snapshot)
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
      if (pendingSaves.size === 0) applySnapshot(snapshot)
    },

    reset: async () => {
      for (const timer of pendingSaves.values()) clearTimeout(timer)
      pendingSaves.clear()
      const snapshot = await api.workspace.reset(...ids())
      applySnapshot(snapshot)
      set((s) => ({ revision: s.revision + 1 }))
    },

    check: async (taskIds) => {
      const chapter = get().chapter
      if (!chapter || get().checking) return []
      set({ checking: taskIds ?? chapter.tasks.map((t) => t.id) })
      try {
        await get().flush()
        const key = chapterKey(chapter.labId, chapter.id)
        const before = useProgress.getState().progress?.chapters[key]
        const { results, progress } = await api.checks.run(chapter.labId, chapter.id, taskIds)
        useProgress.getState().set(progress)
        const after = progress.chapters[key]
        const ids = { repo: chapter.labId, issue: chapter.id }
        const passed = results.filter((r) => r.passed).length
        track('check_run', { ...ids, passed, failed: results.length - passed })
        const hints = hintsUnlocked(after?.nonGreenChecks ?? 0)
        if (hints > hintsUnlocked(before?.nonGreenChecks ?? 0)) {
          track('hints_unlocked', { ...ids, hints })
        }
        if (after?.completedAt && !before?.completedAt) track('issue_completed', ids)
        useSettings.getState().setLeftTab('tasks')
        return results
      } finally {
        set({ checking: null })
      }
    },

    run: async () => {
      if (!get().chapter?.terminal.suggestedCommand) return
      await get().flush()
      set((s) => ({ runs: s.runs + 1 }))
    },

    setTourOpen: (tourOpen) => set({ tourOpen })
  }
})
