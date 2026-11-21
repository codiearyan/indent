import type * as Monaco from 'monaco-editor'
import { onShortcutsChange } from '@/lib/shortcuts'

/**
 * Adds the editor's shortcut bindings now and again whenever keys change in Settings. Monaco
 * cannot change the keys of a binding, so each change removes the old ones and adds new ones.
 */
export function bindShortcuts(
  editor: Monaco.editor.IStandaloneCodeEditor,
  bind: () => Monaco.IDisposable[]
): void {
  let bindings = bind()
  const unbind = (): void => bindings.forEach((binding) => binding.dispose())
  const stop = onShortcutsChange(() => {
    unbind()
    bindings = bind()
  })
  editor.onDidDispose(() => {
    stop()
    unbind()
  })
}
