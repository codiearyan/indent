import type * as Monaco from 'monaco-editor'
import { initVimMode, VimMode } from 'monaco-vim'
import { useWorkspace } from '@/stores/workspace'

// The package's types leave out `Vim`, the object its documentation uses for custom commands.
const { Vim } = VimMode as unknown as {
  Vim: { defineEx(name: string, short: string, run: () => void): void }
}

// Files save as you type, so `:w` only has to do what the save shortcut does.
Vim.defineEx('write', 'w', () => void useWorkspace.getState().flush())

/** Turns Vim keys on for one editor and shows the mode in `status`. Returns how to turn them off. */
export function attachVim(
  editor: Monaco.editor.IStandaloneCodeEditor,
  status: HTMLElement
): () => void {
  const vim = initVimMode(editor, status)
  return () => vim.dispose()
}
