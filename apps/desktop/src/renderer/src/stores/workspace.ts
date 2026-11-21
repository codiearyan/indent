import { toast } from 'sonner'
import { create } from 'zustand'
import type {
  Chapter,
  CheckResult,
  ConflictChoice,
  ProgressState,
  WorkspaceFile,
  WorkspaceSnapshot
} from '@shared/types'
import { FAILS_BEFORE_TIP, chapterKey, hintsUnlocked } from '@shared/rules'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/utils'
import { track } from '@/lib/telemetry'
import { useCatalog } from './catalog'
import { useProgress } from './progress'
import { useSettings } from './settings'
import { useOpenTabs } from './tabs'
import { closeTab, initialTabs, openTab, pruneTabs, type OpenTabs } from '@/features/editor/tabs'

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
  /** Files the learner changed that a repo update changed too. */
  conflicts: string[]
  /** Reset keeps the files the learner added; false for a workspace from before that. */
  remembered: boolean
  /** Files open as tabs, in the order they were opened. */
  openPaths: string[]
  activePath: string | null
  /** Counts writes to disk, so the Browser panel knows when to reload. */
  revision: number
  /** Task ids being checked right now, or null. */
  checking: string[] | null
  /** Counts presses of Run; the terminal runs the issue's command on each change. */
  runs: number
  tourOpen: boolean

  open(labId: string, chapterId: string): Promise<void>
  /** Opens a file as a tab, or switches to its tab, and makes it the active file. */
  openFile(path: string): void
  /** Closes a file's tab. The file stays on disk. */
  closeFile(path: string): void
  /** Updates the buffer and saves to disk after a short pause. */
  edit(path: string, content: string): void
  /** Writes pending edits now. */
  flush(): Promise<void>
  /** Re-reads files from disk, for changes made in the terminal. */
  refresh(): Promise<void>
  /** Restores the starter files. */
  reset(): Promise<void>
  /** Keeps the learner's version of a conflicted file, or takes the new one. */
  resolveConflict(path: string, choice: ConflictChoice): Promise<void>
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

  const setTabs = ({ paths, active }: OpenTabs): void => {
    set({ openPaths: paths, activePath: active })
    const chapter = get().chapter
    if (chapter) {
      useOpenTabs.getState().remember(chapterKey(chapter.labId, chapter.id), { paths, active })
    }
  }

  /** `opening` restores the issue's remembered tabs; otherwise tabs of files that are gone close. */
  const applySnapshot = (
    { files, dir, starter, conflicts, updated, remembered }: WorkspaceSnapshot,
    opening = false
  ): void => {
    const { openPaths, activePath, chapter } = get()
    const existing = files.map((f) => f.path)
    const saved = chapter && useOpenTabs.getState().byChapter[chapterKey(chapter.labId, chapter.id)]
    const tabs = opening
      ? initialTabs(saved ?? undefined, chapter?.files ?? [], existing)
      : pruneTabs({ paths: openPaths, active: activePath }, existing)
    if (updated.length > 0) {
      set((s) => ({ revision: s.revision + 1 }))
      if (conflicts.length === 0) toast('This issue was updated. Your changes are kept.')
    }
    set({ files, dir, starter, conflicts, remembered })
    setTabs(tabs)
  }

  return {
    status: 'idle',
    error: null,
    chapter: null,
    dir: '',
    files: [],
    starter: {},
    conflicts: [],
    remembered: true,
    openPaths: [],
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
        conflicts: [],
        openPaths: [],
        activePath: null
      })
      const catalog = useCatalog.getState()
      if (catalog.labs?.find((lab) => lab.id === labId)?.availability) {
        if (!(await catalog.download(labId))) {
          const failed = useCatalog.getState().downloads[labId]
          set({ status: 'error', error: failed?.state === 'failed' ? failed.message : null })
          return
        }
      }
      try {
        const [chapter, snapshot, progress] = await Promise.all([
          api.content.getChapter(labId, chapterId),
          api.workspace.open(labId, chapterId),
          api.progress.touch(labId, chapterId)
        ])
        useProgress.getState().set(progress)
        if (repoJustStarted(progress, labId, chapterId)) track('repo_started', { repo: labId })
        set({ chapter, status: 'ready' })
        applySnapshot(snapshot, true)
      } catch (error) {
        set({ status: 'error', error: errorMessage(error) })
      }
    },

    openFile: (path) =>
      setTabs(openTab({ paths: get().openPaths, active: get().activePath }, path)),

    closeFile: (path) => {
      if (pendingSaves.has(path)) void save(path)
      setTabs(closeTab({ paths: get().openPaths, active: get().activePath }, path))
    },

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

    resolveConflict: async (path, choice) => {
      await get().flush()
      const snapshot = await api.workspace.resolveConflict(...ids(), path, choice)
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
        useSettings.getState().setLeftTab('tasks')
        // No results: the repo tools are not ready, and the notice above the tasks says why.
        if (results.length === 0) return results
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
        // The main process skips this when AI is off or the task already has its tip.
        const tasks = progress.chapters[chapterKey(chapter.labId, chapter.id)]?.tasks ?? {}
        for (const result of results) {
          const task = tasks[result.taskId]
          if (result.passed || task?.tip || (task?.failedChecks ?? 0) < FAILS_BEFORE_TIP) continue
          api.ai
            .tip(chapter.labId, chapter.id, result.taskId)
            .then((next) => useProgress.getState().set(next))
            .catch(() => {})
        }
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
