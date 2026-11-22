import type * as Monaco from 'monaco-editor'
import { create } from 'zustand'
import type { AiCompleteRequest, ChapterProgress, TaskDef } from '@shared/types'
import { chapterKey } from '@shared/rules'
import { api } from '@/lib/api'
import { monacoShortcut, SHORTCUTS } from '@/lib/shortcuts'
import { track } from '@/lib/telemetry'
import { useProgress } from '@/stores/progress'
import { useSettings } from '@/stores/settings'
import { useWorkspace } from '@/stores/workspace'
import { bindShortcuts } from '@/features/editor/shortcutBindings'
import { useAi } from './aiStore'
import { completionTask, cursorTask, waitsForRequest } from './suggestionTask'

const PAUSE_MS = 500
const PREFIX_CHARS = 4000
const SUFFIX_CHARS = 1000

function pause(ms: number, token: Monaco.CancellationToken): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(!token.isCancellationRequested), ms)
    token.onCancellationRequested(() => {
      clearTimeout(timer)
      resolve(false)
    })
  })
}

/** The suggestion being written, if any, and how to stop it; the editor shows it at the cursor. */
export const usePendingSuggestion = create<{
  pending: { model: Monaco.editor.ITextModel; position: Monaco.IPosition; stop(): void } | null
}>(() => ({ pending: null }))

/** Waits for a suggestion while the editor shows it is coming; empty when stopped or cancelled. */
async function writeSuggestion(
  request: AiCompleteRequest,
  model: Monaco.editor.ITextModel,
  position: Monaco.IPosition,
  token: Monaco.CancellationToken
): Promise<string> {
  let stop = (): void => {}
  const stopped = new Promise<string>((resolve) => {
    stop = () => {
      api.ai.cancelComplete()
      resolve('')
    }
  })
  const pending = { model, position, stop }
  const subscription = token.onCancellationRequested(stop)
  usePendingSuggestion.setState({ pending })
  try {
    return await Promise.race([api.ai.complete(request), stopped])
  } finally {
    subscription.dispose()
    if (usePendingSuggestion.getState().pending === pending) {
      usePendingSuggestion.setState({ pending: null })
    }
  }
}

/** The task under the cursor of the editor last typed in; the editor bar reads it. */
export const useCursorTask = create<{ taskId: string | null }>(() => ({ taskId: null }))

interface TaskAtCursor {
  task: TaskDef | undefined
  progress: ChapterProgress | undefined
}

function taskAt(model: Monaco.editor.ITextModel, position: Monaco.IPosition): TaskAtCursor {
  const chapter = useWorkspace.getState().chapter
  if (!chapter) return { task: undefined, progress: undefined }
  const progress = useProgress.getState().progress?.chapters[chapterKey(chapter.labId, chapter.id)]
  const before = model.getValue().slice(0, model.getOffsetAt(position))
  return { task: cursorTask(chapter.tasks, progress, model.uri.path.slice(1), before), progress }
}

/** What a suggestion at this position sends: the code around the cursor and the task. */
export function completionRequest(
  model: Monaco.editor.ITextModel,
  position: Monaco.IPosition
): AiCompleteRequest | null {
  const chapter = useWorkspace.getState().chapter
  if (!chapter) return null
  const { task, progress } = taskAt(model, position)
  const offset = model.getOffsetAt(position)
  const text = model.getValue()
  return {
    labId: chapter.labId,
    chapterId: chapter.id,
    path: model.uri.path.slice(1),
    prefix: text.slice(Math.max(0, offset - PREFIX_CHARS), offset),
    suffix: text.slice(offset, offset + SUFFIX_CHARS),
    task: task && completionTask(task, progress?.tasks[task.id])
  }
}

/** Binds the suggest shortcut to Monaco's explicit trigger; Monaco ships it without a key. */
export function bindSuggestShortcut(
  monaco: typeof Monaco,
  editor: Monaco.editor.IStandaloneCodeEditor
): void {
  // Claimed only while suggestions wait to be asked for: on some keyboard layouts this
  // combination types a character.
  const onRequest = editor.createContextKey<boolean>('suggestOnRequest', false)
  const sync = (): void => {
    const model = editor.getModel()
    const position = editor.getPosition()
    const { task, progress } =
      model && position ? taskAt(model, position) : { task: undefined, progress: undefined }
    const taskId = task?.id ?? null
    const shown = useCursorTask.getState().taskId
    if (taskId !== shown && (editor.hasTextFocus() || shown === null)) {
      useCursorTask.setState({ taskId })
    }
    onRequest.set(waitsForRequest(useAi.getState().config, task, progress))
  }
  sync()
  // Esc stops a suggestion being written in this editor. In Vim mode Esc stays Vim's; leaving
  // insert mode moves the cursor, which stops it anyway.
  const pending = editor.createContextKey<boolean>('suggestionPending', false)
  const syncPending = (): void => {
    const shown = usePendingSuggestion.getState().pending
    pending.set(!!shown && shown.model === editor.getModel() && !useSettings.getState().editor.vim)
  }
  editor.onDidDispose(usePendingSuggestion.subscribe(syncPending))
  editor.onDidChangeModel(syncPending)
  editor.addCommand(
    monaco.KeyCode.Escape,
    () => usePendingSuggestion.getState().pending?.stop(),
    'suggestionPending && editorTextFocus'
  )
  editor.onDidDispose(useAi.subscribe(sync))
  editor.onDidDispose(useProgress.subscribe(sync))
  editor.onDidChangeCursorPosition(sync)
  editor.onDidChangeModel(sync)
  editor.onDidFocusEditorText(sync)
  bindShortcuts(editor, () => [
    editor.addAction({
      id: 'indent.suggest',
      label: SHORTCUTS.suggest.label,
      keybindings: [monacoShortcut('suggest', monaco)],
      keybindingContext: 'suggestOnRequest',
      run: () => editor.trigger('keyboard', 'editor.action.inlineSuggest.trigger', {})
    })
  ])
}

/** Registers the grey, Tab-to-accept suggestions. The editor calls this once after Monaco loads. */
export function registerInlineSuggestions(monaco: typeof Monaco): Monaco.IDisposable {
  return monaco.languages.registerInlineCompletionsProvider('*', {
    displayName: 'Indent AI',

    provideInlineCompletions: async (model, position, context, token) => {
      const none = { items: [] }
      const { config } = useAi.getState()
      const chapter = useWorkspace.getState().chapter
      const explicit = context.triggerKind === monaco.languages.InlineCompletionTriggerKind.Explicit
      const mode = config?.suggestions ?? 'off'
      if (!config?.enabled || !config.provider || !chapter || mode === 'off') return none
      if (!explicit) {
        const { task, progress } = taskAt(model, position)
        if (waitsForRequest(config, task, progress)) return none
      }
      // Monaco cancels the token on the next keystroke, so only a real pause gets through.
      if (!explicit && !(await pause(PAUSE_MS, token))) return none

      // Suggestions as you type fire on every pause, so only the ones asked for are counted.
      if (explicit) track('suggestion_requested', { repo: chapter.labId, issue: chapter.id })
      const request = completionRequest(model, position)
      if (!request) return none
      const insertText = await writeSuggestion(request, model, position, token)
      if (!insertText || token.isCancellationRequested) return none
      return {
        items: [
          {
            insertText,
            range: new monaco.Range(
              position.lineNumber,
              position.column,
              position.lineNumber,
              position.column
            )
          }
        ]
      }
    },

    disposeInlineCompletions: () => {}
  })
}
