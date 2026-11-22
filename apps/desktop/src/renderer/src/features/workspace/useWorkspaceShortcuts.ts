import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { chapterKey } from '@shared/rules'
import { focusEditorSoon, focusedEditor } from '@/features/editor/editors'
import { useQuickOpen } from '@/features/editor/quickOpenStore'
import { toggleTutor } from '@/features/ai/toggleTutor'
import { TAB_SHORTCUTS } from '@/lib/shortcuts'
import { useShortcuts } from '@/lib/useShortcuts'
import { errorMessage } from '@/lib/utils'
import { useProgress } from '@/stores/progress'
import { useSettings } from '@/stores/settings'
import { useWorkspace } from '@/stores/workspace'
import { hintKey, nextHint, useShownHints } from './hints'
import { showHint } from './recordHint'

export function checkAll(): void {
  useWorkspace
    .getState()
    .check()
    .catch((error) => toast.error(errorMessage(error)))
}

export function runCommand(): void {
  useWorkspace
    .getState()
    .run()
    .catch((error) => toast.error(errorMessage(error)))
}

/** Focuses an element once the panel that holds it has rendered. */
function focusSoon(selector: string): void {
  requestAnimationFrame(() => document.querySelector<HTMLElement>(selector)?.focus())
}

function showTerminal(): void {
  useSettings.getState().setPanel('terminal', true)
}

/** Shows the tab at this position, counted from 1, in the focused editor group. */
function selectTab(position: number): () => void {
  return () => {
    const { layout, openFile } = useWorkspace.getState()
    const path = layout.groups[layout.focused]?.paths[position - 1]
    if (path) openFile(path, layout.focused)
  }
}

function showLesson(): void {
  const { panels, setPanel } = useSettings.getState()
  if (panels.zen) setPanel('zen', false)
}

function showNextHint(): void {
  const chapter = useWorkspace.getState().chapter
  if (!chapter) return
  const progress = useProgress.getState().progress?.chapters[chapterKey(chapter.labId, chapter.id)]
  const { shown, setOpen } = useShownHints.getState()
  const key = (taskId: string): string => hintKey(chapter.labId, chapter.id, taskId)
  const next = nextHint(chapter.tasks, progress, (taskId) =>
    Math.max(shown[key(taskId)] ?? 0, progress?.tasks[taskId]?.hintsShown ?? 0)
  )
  if (next.kind === 'done') return void toast('Every task passes.')
  if (next.kind !== 'show') {
    return void toast(
      next.kind === 'locked'
        ? `No new hint for task ${next.task} yet. Hints open after checks that fail.`
        : `Every hint for task ${next.task} is showing.`
    )
  }
  showHint(key(next.taskId), next.hint)
  setOpen(key(next.taskId), true)
  showLesson()
  useSettings.getState().setLeftTab('tasks')
  requestAnimationFrame(() =>
    document
      .getElementById(`hint-${key(next.taskId)}-${next.hint}`)
      ?.scrollIntoView({ block: 'nearest' })
  )
}

export function useWorkspaceShortcuts(): void {
  const navigate = useNavigate()
  const chapter = useWorkspace((s) => s.chapter)
  const ready = useWorkspace((s) => s.status === 'ready')
  const togglePanel = useSettings((s) => s.togglePanel)
  const browser = useSettings((s) => s.panels.browser) && !!chapter?.preview

  const goTo = (chapterId?: string): false | (() => void) =>
    !!chapter && !!chapterId && (() => navigate(`/learn/${chapter.labId}/${chapterId}`))

  useShortcuts({
    check: ready && checkAll,
    runCommand: ready && !!chapter?.terminal.suggestedCommand && runCommand,
    closeFile: () => {
      const { activePath, closeFile } = useWorkspace.getState()
      if (activePath) closeFile(activePath)
    },
    quickOpen: ready && (() => useQuickOpen.getState().setOpen(true)),
    openToSide:
      ready &&
      (() => {
        const { activePath, openToSide } = useWorkspace.getState()
        if (!activePath) return
        openToSide(activePath)
        focusEditorSoon()
      }),
    focusEditor: () => focusedEditor()?.focus(),
    focusLesson: () => {
      showLesson()
      focusSoon('#lesson-panel [role="tab"][aria-selected="true"]')
    },
    focusTerminal: () => {
      showTerminal()
      focusSoon('.xterm-helper-textarea')
    },
    toggleTerminal: () => togglePanel('terminal'),
    toggleFiles: () => togglePanel('files'),
    toggleFocusMode: () => togglePanel('zen'),
    expandBrowser:
      browser &&
      (() => {
        const { browserExpanded, pageWindow, setBrowserExpanded } = useWorkspace.getState()
        if (!pageWindow) setBrowserExpanded(!browserExpanded)
      }),
    nextIssue: goTo(chapter?.nextChapterId),
    previousIssue: goTo(chapter?.prevChapterId),
    openTutor: toggleTutor,
    ...Object.fromEntries(TAB_SHORTCUTS.map((id, i) => [id, ready && selectTab(i + 1)])),
    nextHint: ready && showNextHint
  })
}
