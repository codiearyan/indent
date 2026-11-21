import { useWorkspace } from '@/stores/workspace'
import type { monaco } from './monaco'

const editors = new Map<number, monaco.editor.IStandaloneCodeEditor>()

/** Keeps the editor of a group findable while it lives. Returns the undo. */
export function registerEditor(
  group: number,
  editor: monaco.editor.IStandaloneCodeEditor
): () => void {
  editors.set(group, editor)
  return () => {
    if (editors.get(group) === editor) editors.delete(group)
  }
}

/** The editor of the focused group. */
export function focusedEditor(): monaco.editor.IStandaloneCodeEditor | undefined {
  return editors.get(useWorkspace.getState().layout.focused) ?? editors.get(0)
}

/** Focuses the focused group's editor once React has drawn it. */
export function focusEditorSoon(): void {
  requestAnimationFrame(() => focusedEditor()?.focus())
}
