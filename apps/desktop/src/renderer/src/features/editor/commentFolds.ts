import { create } from 'zustand'
import { commentRuns, lineOutsideFolds } from './commentRuns'
import { monaco } from './monaco'

interface CommentFoldsStore {
  /** Files whose comments are folded, by `foldKey`. */
  folded: Record<string, true>
}

export const useCommentFolds = create<CommentFoldsStore>()(() => ({ folded: {} }))

/** Each editor group folds on its own, so the same file can be folded on one side only. */
export function foldKey(group: number, path: string): string {
  return `${group}:${path}`
}

/**
 * Folds the comment runs of the editor's file, or shows them again. Folds are made as manual
 * ranges from selections, the one way Monaco lets a caller add a fold region of its own.
 */
export async function toggleCommentFolds(
  editor: monaco.editor.ICodeEditor,
  group: number,
  path: string
): Promise<void> {
  const key = foldKey(group, path)
  const model = editor.getModel()
  if (!model) return
  const lines = model.getLinesContent()
  const runs = commentRuns(lines, monaco.editor.tokenize(model.getValue(), model.getLanguageId()))
  const folded = !!useCommentFolds.getState().folded[key]
  const selections = editor.getSelections()
  if (runs.length > 0) {
    editor.setSelections(
      runs.map((r) => new monaco.Selection(r.start, 1, r.end, model.getLineMaxColumn(r.end)))
    )
    const action = folded
      ? 'editor.removeManualFoldingRanges'
      : 'editor.createFoldingRangeFromSelection'
    // The action reads the selections only once the folding model is ready, so wait for it.
    await editor.getAction(action)?.run()
    // A cursor left inside a folded run would open it again, so it moves to the run's first line.
    const cursors = (selections ?? []).map((sel) => {
      const line = folded ? sel.positionLineNumber : lineOutsideFolds(sel.positionLineNumber, runs)
      return line === sel.positionLineNumber ? sel : new monaco.Selection(line, 1, line, 1)
    })
    if (cursors.length > 0) editor.setSelections(cursors)
  }
  useCommentFolds.setState((s) => {
    const next = { ...s.folded }
    if (folded) delete next[key]
    else next[key] = true
    return { folded: next }
  })
}
