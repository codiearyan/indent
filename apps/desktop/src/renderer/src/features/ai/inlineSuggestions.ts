import type * as Monaco from 'monaco-editor'
import { api } from '@/lib/api'
import { monacoShortcut, SHORTCUTS } from '@/lib/shortcuts'
import { track } from '@/lib/telemetry'
import { useWorkspace } from '@/stores/workspace'
import { bindShortcuts } from '@/features/editor/shortcutBindings'
import { useAi } from './aiStore'

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

/** Binds the suggest shortcut to Monaco's explicit trigger; Monaco ships it without a key. */
export function bindSuggestShortcut(
  monaco: typeof Monaco,
  editor: Monaco.editor.IStandaloneCodeEditor
): void {
  // Claimed only in manual mode: on some keyboard layouts this combination types a character.
  const manual = editor.createContextKey<boolean>('suggestOnRequest', false)
  const sync = (): void => {
    const { config } = useAi.getState()
    manual.set(!!config?.enabled && config.suggestions === 'manual')
  }
  sync()
  editor.onDidDispose(useAi.subscribe(sync))
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
      if (mode === 'manual' && !explicit) return none
      // Monaco cancels the token on the next keystroke, so only a real pause gets through.
      if (!explicit && !(await pause(PAUSE_MS, token))) return none

      // Suggestions as you type fire on every pause, so only the ones asked for are counted.
      if (explicit) track('suggestion_requested', { repo: chapter.labId, issue: chapter.id })
      const offset = model.getOffsetAt(position)
      const text = model.getValue()
      const insertText = await api.ai.complete({
        labId: chapter.labId,
        chapterId: chapter.id,
        path: model.uri.path.slice(1),
        prefix: text.slice(Math.max(0, offset - PREFIX_CHARS), offset),
        suffix: text.slice(offset, offset + SUFFIX_CHARS)
      })
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
