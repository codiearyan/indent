import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { chapterKey } from '@shared/rules'
import { useAiEnabled } from '@/features/ai/aiStore'
import { monaco } from '@/features/editor/monaco'
import { useShortcuts } from '@/lib/useShortcuts'
import { errorMessage } from '@/lib/utils'
import { useProgress } from '@/stores/progress'
import { useSettings } from '@/stores/settings'
import { useWorkspace } from '@/stores/workspace'
import { hintKey, nextHint, useShownHints } from './hints'

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

function showPanel(key: 'terminal' | 'chat'): void {
  const { panels, setPanel } = useSettings.getState()
  if (key === 'chat' && panels.zen) setPanel('zen', false)
  setPanel(key, true)
}

function showLesson(): void {
  const { panels, setPanel } = useSettings.getState()
  if (panels.zen) setPanel('zen', false)
}

function showNextHint(): void {
  const chapter = useWorkspace.getState().chapter
  if (!chapter) return
  const progress = useProgress.getState().progress?.chapters[chapterKey(chapter.labId, chapter.id)]
  const { shown, setShown } = useShownHints.getState()
  const key = (taskId: string): string => hintKey(chapter.labId, chapter.id, taskId)
  const next = nextHint(chapter.tasks, progress, (taskId) => shown[key(taskId)] ?? 0)
  if (next.kind === 'done') return void toast('Every task passes.')
  if (next.kind !== 'show') {
    return void toast(
      next.kind === 'locked'
        ? `No new hint for task ${next.task} yet. Hints open after checks that fail.`
        : `Every hint for task ${next.task} is showing.`
    )
  }
  setShown(key(next.taskId), next.hint)
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
  const aiOn = useAiEnabled()
  const togglePanel = useSettings((s) => s.togglePanel)

  const goTo = (chapterId?: string): false | (() => void) =>
    !!chapter && !!chapterId && (() => navigate(`/learn/${chapter.labId}/${chapterId}`))

  useShortcuts({
    check: ready && checkAll,
    runCommand: ready && !!chapter?.terminal.suggestedCommand && runCommand,
    closeFile: () => {
      const { activePath, closeFile } = useWorkspace.getState()
      if (activePath) closeFile(activePath)
    },
    focusEditor: () => monaco.editor.getEditors()[0]?.focus(),
    focusLesson: () => {
      showLesson()
      focusSoon('#lesson-panel [role="tab"][aria-selected="true"]')
    },
    focusTerminal: () => {
      showPanel('terminal')
      focusSoon('.xterm-helper-textarea')
    },
    toggleTerminal: () => togglePanel('terminal'),
    toggleFiles: () => togglePanel('files'),
    toggleFocusMode: () => togglePanel('zen'),
    nextIssue: goTo(chapter?.nextChapterId),
    previousIssue: goTo(chapter?.prevChapterId),
    openTutor:
      aiOn &&
      (() => {
        showPanel('chat')
        focusSoon('#tutor-input')
      }),
    nextHint: ready && showNextHint
  })
}
