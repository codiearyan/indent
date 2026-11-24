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

/** Opens `path` in the focused group, puts the cursor on the line and focuses the editor. */
export function openAtLine(path: string, line: number, column = 1): void {
  useWorkspace.getState().openFile(path)
  let frames = 0
  const reveal = (): void => {
    const editor = focusedEditor()
    // The editor takes the file's model once React has drawn the new tab.
    if (editor?.getModel()?.uri.path !== `/${path}`) {
      if (++frames < 10) requestAnimationFrame(reveal)
      return
    }
    editor.setPosition({ lineNumber: line, column })
    editor.revealPositionInCenter({ lineNumber: line, column })
    editor.focus()
  }
  requestAnimationFrame(reveal)
}
