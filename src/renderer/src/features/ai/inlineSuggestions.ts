import type * as Monaco from 'monaco-editor'
import { api } from '@/lib/api'
import { useWorkspace } from '@/stores/workspace'
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

/** Registers the grey, Tab-to-accept suggestions. The editor calls this once after Monaco loads. */
export function registerInlineSuggestions(monaco: typeof Monaco): Monaco.IDisposable {
  return monaco.languages.registerInlineCompletionsProvider('*', {
    displayName: 'Labbench AI',

    provideInlineCompletions: async (model, position, _context, token) => {
      const none = { items: [] }
      const { config } = useAi.getState()
      const chapter = useWorkspace.getState().chapter
      if (!config?.suggestions || !config.provider || !chapter) return none
      // Monaco cancels the token on the next keystroke, so only a real pause gets through.
      if (!(await pause(PAUSE_MS, token))) return none

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
