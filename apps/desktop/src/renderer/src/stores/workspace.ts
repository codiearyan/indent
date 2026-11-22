import { toast } from 'sonner'
import { create } from 'zustand'
import type {
  Chapter,
  CheckResult,
  ConflictChoice,
  IdeInfo,
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
import { noticeMoment } from '@/features/progress/momentStore'
import { useSettings } from './settings'
import { useOpenTabs } from './tabs'
import {
  activeOf,
  clampSplit,
  closeInGroup,
  dropFile,
  focusGroup,
  initialLayout,
  NO_LAYOUT,
  openInGroup,
  openToSide,
  pruneLayout,
  storedTabs,
  type DropTarget,
  type EditorLayout
} from '@/features/editor/layout'

const SAVE_DELAY_MS = 400

/** True right after the first issue of a repo was opened for the first time. */
function repoJustStarted(progress: ProgressState, labId: string, chapterId: string): boolean {
  const opened = Object.keys(progress.chapters).filter((key) => key.startsWith(`${labId}/`))
  const entry = progress.chapters[chapterKey(labId, chapterId)]
  return opened.length === 1 && entry?.startedAt === entry?.lastOpenedAt
}

interface WorkspaceStore {
  status: 'idle' | 'loading' | 'ready' | 'error' | 'elsewhere'
  error: string | null
  /** The earlier work folder holding this issue's work, while the learner chooses what to do. */
  elsewhere: string | null
  chapter: Chapter | null
  /** Absolute workspace folder on disk. */
  dir: string
  files: WorkspaceFile[]
  /** Every folder, empty ones too. */
  folders: string[]
  /** Starter content by path; a file that differs from it, or has none, counts as edited. */
  starter: Record<string, string>
  /** Files the learner changed that a repo update changed too. */
  conflicts: string[]
  /** Reset keeps the files the learner added; false for a workspace from before that. */
  remembered: boolean
  /** Starter files that are gone from disk; checks wait until they are back. */
  missing: string[]
  /** The editor groups and their tabs. */
  layout: EditorLayout
  /** The active file of the focused group. */
  activePath: string | null
  /** Counts writes to disk, so the Browser panel knows when to reload. */
  revision: number
  /** Task ids being checked right now, or null. */
  checking: string[] | null
  /** Counts presses of Run; the terminal runs the issue's command on each change. */
  runs: number
  tourOpen: boolean
  /** The issue is worked on in an IDE: the editor and terminal are away and the window is narrow. */
  companion: boolean
  /** `labId/chapterId` of the issue whose folder the IDE was last asked to open. */
  ideIssue: string | null
  /** The Browser panel fills the sheet. */
  browserExpanded: boolean
  /** The page shows in its own window instead of the Browser panel. */
  pageWindow: boolean

  /** With `here`, starts the issue in the current folder even when an earlier one has its work. */
  open(labId: string, chapterId: string, options?: { here?: boolean }): Promise<void>
  /** Opens a file as a tab of a group, the focused one by default, and makes it active. */
  openFile(path: string, group?: number): void
  /** Opens a file in the other group, adding a second group when there is one only. */
  openToSide(path: string, from?: number): void
  /** Closes a file's tab in a group, the focused one by default. The file stays on disk. */
  closeFile(path: string, group?: number): void
  focusGroup(group: number): void
  /** Opens a dragged file where it was dropped; a tab from another group moves there. */
  dropFile(path: string, target: DropTarget, from?: number): void
  /** Sets the width of the first group, in percent. */
  setSplit(split: number): void
  /** Updates the buffer and saves to disk after a short pause. */
  edit(path: string, content: string): void
  /** Writes pending edits now. */
  flush(): Promise<void>
  /** Re-reads files from disk, for changes made in the terminal. */
  refresh(): Promise<void>
  /** Restores the starter files. */
  reset(): Promise<void>
  /** Copies back the starter files in `missing`, leaving every other file alone. */
  restoreMissing(): Promise<void>
  /** Keeps the learner's version of a conflicted file, or takes the new one. */
  resolveConflict(path: string, choice: ConflictChoice): Promise<void>
  /** Runs the hidden tests for some tasks, or all. */
  check(taskIds?: string[]): Promise<CheckResult[]>
  /** Saves, then runs the issue's suggested command in the terminal. */
  run(): Promise<void>
  setTourOpen(open: boolean): void
  /** Opens the issue's folder in an IDE and, once it opened, switches to the companion layout. */
  openInIde(ide: IdeInfo): Promise<void>
  /** Brings the editor back, with the files as the IDE left them. */
  leaveCompanion(): Promise<void>
  setBrowserExpanded(expanded: boolean): void
  /** Shows the page in its own window, or brings that window to the front. */
  openPageWindow(): Promise<void>
}

const pendingSaves = new Map<string, ReturnType<typeof setTimeout> | undefined>()

/** Counts launches of an IDE and leavings of an issue, so a launch knows when it was left behind. */
let ideLaunch = 0

/** Counts opens, so one that was left for another issue does not land on its page. */
let opens = 0

export const useWorkspace = create<WorkspaceStore>()((set, get) => {
  const ids = (): [string, string] => {
    const chapter = get().chapter
    if (!chapter) throw new Error('No issue is open')
    return [chapter.labId, chapter.id]
  }

  const save = async (path: string): Promise<void> => {
    clearTimeout(pendingSaves.get(path))
    pendingSaves.delete(path)
    const file = get().files.find((f) => f.path === path)
    if (!file) return
    try {
      await api.workspace.writeFile(...ids(), path, file.content)
    } catch (error) {
      // Still pending, so a refresh cannot replace text that never reached the disk.
      if (!pendingSaves.has(path)) pendingSaves.set(path, undefined)
      toast.error(`Could not save ${path}`, {
        id: 'save-failed',
        description: errorMessage(error)
      })
      throw error
    }
    set((s) => ({ revision: s.revision + 1 }))
  }

  const setLayout = (layout: EditorLayout): void => {
    set({ layout, activePath: activeOf(layout) })
    const chapter = get().chapter
    if (chapter) {
      useOpenTabs.getState().remember(chapterKey(chapter.labId, chapter.id), storedTabs(layout))
    }
  }

  /** `opening` restores the issue's remembered tabs; otherwise tabs of files that are gone close. */
  const applySnapshot = (
    { files, folders, dir, starter, conflicts, updated, remembered, missing }: WorkspaceSnapshot,
    opening = false
  ): void => {
    const { layout, chapter } = get()
    const existing = files.map((f) => f.path)
    const saved = chapter && useOpenTabs.getState().byChapter[chapterKey(chapter.labId, chapter.id)]
    const next = opening
      ? initialLayout(saved ?? undefined, chapter?.files ?? [], existing)
      : pruneLayout(layout, existing)
    if (updated.length > 0) {
      set((s) => ({ revision: s.revision + 1 }))
      if (conflicts.length === 0) toast('This issue was updated. Your changes are kept.')
    }
    set({ files, folders, dir, starter, conflicts, remembered, missing })
    setLayout(next)
  }

  /** Pending edits are written first, or the snapshot would replace them with what is on disk. */
  const change = async (job: () => Promise<WorkspaceSnapshot>): Promise<void> => {
    await get().flush()
    applySnapshot(await job())
    set((s) => ({ revision: s.revision + 1 }))
  }

  return {
    status: 'idle',
    error: null,
    elsewhere: null,
    chapter: null,
    dir: '',
    files: [],
    folders: [],
    starter: {},
    conflicts: [],
    remembered: true,
    missing: [],
    layout: NO_LAYOUT,
    activePath: null,
    revision: 0,
    checking: null,
    runs: 0,
    tourOpen: false,
    companion: false,
    ideIssue: null,
    browserExpanded: false,
    pageWindow: false,

    open: async (labId, chapterId, { here = false } = {}) => {
      const opening = ++opens
      // A save that failed was already reported; it must not hold the next issue back.
      await get()
        .flush()
        .catch(() => {})
      // Before the timers: by now they may belong to the issue a newer open is showing.
      if (opening !== opens) return
      for (const timer of pendingSaves.values()) clearTimeout(timer)
      pendingSaves.clear()
      api.preview.close()
      set({
        browserExpanded: false,
        pageWindow: false,
        status: 'loading',
        error: null,
        elsewhere: null,
        chapter: null,
        files: [],
        folders: [],
        starter: {},
        conflicts: [],
        missing: [],
        layout: NO_LAYOUT,
        activePath: null
      })
      const catalog = useCatalog.getState()
      if (catalog.labs?.find((lab) => lab.id === labId)?.availability) {
        if (!(await catalog.download(labId))) {
          if (opening !== opens) return
          const failed = useCatalog.getState().downloads[labId]
          set({ status: 'error', error: failed?.state === 'failed' ? failed.message : null })
          return
        }
        if (opening !== opens) return
      }
      try {
        const elsewhere = here ? null : await api.workspace.findElsewhere(labId, chapterId)
        if (opening !== opens) return
        if (elsewhere) {
          set({ status: 'elsewhere', elsewhere })
          return
        }
        const [chapter, snapshot, progress] = await Promise.all([
          api.content.getChapter(labId, chapterId),
          api.workspace.open(labId, chapterId),
          api.progress.touch(labId, chapterId)
        ])
        if (opening !== opens) return
        useProgress.getState().set(progress)
        if (repoJustStarted(progress, labId, chapterId)) track('repo_started', { repo: labId })
        set({ chapter, status: 'ready' })
        applySnapshot(snapshot, true)
      } catch (error) {
        if (opening === opens) set({ status: 'error', error: errorMessage(error) })
      }
    },

    openFile: (path, group) => setLayout(openInGroup(get().layout, path, group)),

    openToSide: (path, from) => setLayout(openToSide(get().layout, path, from)),

    closeFile: (path, group) => {
      if (pendingSaves.has(path)) void save(path).catch(() => {})
      setLayout(closeInGroup(get().layout, path, group))
    },

    focusGroup: (group) => {
      if (group !== get().layout.focused) setLayout(focusGroup(get().layout, group))
    },

    dropFile: (path, target, from) => setLayout(dropFile(get().layout, path, target, from)),

    setSplit: (split) => setLayout({ ...get().layout, split: clampSplit(split) }),

    edit: (path, content) => {
      set((s) => ({ files: s.files.map((f) => (f.path === path ? { ...f, content } : f)) }))
      clearTimeout(pendingSaves.get(path))
      pendingSaves.set(
        path,
        setTimeout(() => void save(path).catch(() => {}), SAVE_DELAY_MS)
      )
    },

    flush: async () => {
      await Promise.all([...pendingSaves.keys()].map(save))
    },

    refresh: async () => {
      const chapter = get().chapter
      if (!chapter || pendingSaves.size > 0) return
      const snapshot = await api.workspace.open(chapter.labId, chapter.id)
      // The learner may have opened another issue while the files were read.
      if (get().chapter === chapter && pendingSaves.size === 0) applySnapshot(snapshot)
    },

    reset: async () => {
      for (const timer of pendingSaves.values()) clearTimeout(timer)
      pendingSaves.clear()
      api.preview.close()
      set({ pageWindow: false })
      const snapshot = await api.workspace.reset(...ids())
      applySnapshot(snapshot)
      set((s) => ({ revision: s.revision + 1 }))
    },

    restoreMissing: () => change(() => api.workspace.restoreMissing(...ids())),

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
        // No results: the repo tools are not ready or files are missing, and a notice says why.
        if (results.length === 0) {
          // A file deleted in the terminal changes nothing the window would notice.
          await get().refresh()
          return results
        }
        const previous = useProgress.getState().progress
        useProgress.getState().set(progress)
        if (previous) noticeMoment(previous, progress)
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

    setTourOpen: (tourOpen) => set({ tourOpen }),

    openInIde: async (ide) => {
      // What was typed here has to be on disk before the IDE reads the folder.
      await get().flush()
      const [labId, chapterId] = ids()
      const launch = ++ideLaunch
      await api.ide.open(ide.id, labId, chapterId)
      // The issues were left while the IDE was starting: the layout is for a page that is gone.
      if (launch !== ideLaunch) return
      set({ companion: true, ideIssue: chapterKey(labId, chapterId) })
      await api.ide.setCompact(true)
    },

    setBrowserExpanded: (browserExpanded) => set({ browserExpanded }),

    openPageWindow: async () => {
      await api.preview.openWindow(...ids())
      set({ pageWindow: true, browserExpanded: false })
    },

    leaveCompanion: async () => {
      ideLaunch++
      if (!get().companion) return
      set({ companion: false, ideIssue: null })
      await api.ide.setCompact(false)
      await get().refresh()
    }
  }
})

api.preview.onWindow((event) => {
  const chapter = useWorkspace.getState().chapter
  if (event.type === 'closed' && chapter?.labId === event.labId && chapter.id === event.chapterId) {
    useWorkspace.setState({ pageWindow: false })
  }
})

// The page's window and the browser reload after every save, as the panel does.
useWorkspace.subscribe((state, before) => {
  const chapter = state.chapter
  if (chapter?.preview && chapter === before.chapter && state.revision !== before.revision) {
    api.preview.reload(chapter.labId, chapter.id)
  }
})
