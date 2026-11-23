import { useLayoutEffect } from 'react'
import type { WorkspaceFile } from '@shared/types'
import { useWorkspace } from '@/stores/workspace'
import { languageFor, monaco, pathOf, uriFor } from './monaco'

// The models outlive the editor pane, which goes away while an issue is worked on in an IDE. What
// their listeners read is kept here, so a model made by an earlier pane still reads today's values.
let applyingExternal = false
let onEditNow: () => void = () => {}
/** The file each model last matched. The store keeps a file's object until its text changes. */
const synced = new WeakMap<monaco.editor.ITextModel, WorkspaceFile>()

/**
 * Keeps one Monaco model per workspace file, shared by every editor group, so an edit in one
 * group shows in the other. A layout effect, so the models exist before the editors pick theirs.
 */
export function useModels(files: WorkspaceFile[], onEdit: () => void): void {
  useLayoutEffect(() => {
    onEditNow = onEdit
  }, [onEdit])

  useLayoutEffect(() => {
    const wanted = new Set<string>()
    for (const file of files) {
      const uri = uriFor(file.path)
      wanted.add(uri.toString())
      const model = monaco.editor.getModel(uri)
      if (model && synced.get(model) === file) continue
      if (!model) {
        const created = monaco.editor.createModel(file.content, languageFor(file.path), uri)
        created.onDidChangeContent(() => {
          if (applyingExternal) return
          useWorkspace.getState().edit(pathOf(created.uri), created.getValue())
          onEditNow()
        })
        synced.set(created, file)
        continue
      }
      if (model.getValue() !== file.content) {
        // Changed on disk (terminal, reset): replace as one undoable edit and do not echo it back.
        applyingExternal = true
        model.pushEditOperations(
          [],
          [{ range: model.getFullModelRange(), text: file.content }],
          () => null
        )
        applyingExternal = false
      }
      synced.set(model, file)
    }
    for (const model of monaco.editor.getModels()) {
      if (model.uri.scheme === 'file' && !wanted.has(model.uri.toString())) model.dispose()
    }
  }, [files])
}

/** Keeps the models in step with the files, in a component of its own so typing renders only it. */
export function ModelSync({ onEdit }: { onEdit: () => void }): null {
  useModels(
    useWorkspace((s) => s.files),
    onEdit
  )
  return null
}
