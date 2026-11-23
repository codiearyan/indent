import type { WorkspaceFile } from '@shared/types'

export type FileChange = 'modified' | 'new' | null

// The store keeps a file's object until its text changes, so an answer holds for that object
// until the starter changes. Typing then compares one file, not every file of the workspace.
const known = new WeakMap<Record<string, string>, WeakMap<WorkspaceFile, FileChange>>()

/** How a workspace file differs from the issue's starter, the way git marks a working tree. */
export function fileChange(starter: Record<string, string>, file: WorkspaceFile): FileChange {
  let byFile = known.get(starter)
  if (!byFile) known.set(starter, (byFile = new WeakMap()))
  if (byFile.has(file)) return byFile.get(file) ?? null
  const change = !(file.path in starter)
    ? 'new'
    : starter[file.path] === file.content
      ? null
      : 'modified'
  byFile.set(file, change)
  return change
}
