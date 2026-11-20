import type { WorkspaceFile } from '@shared/types'

export type FileChange = 'modified' | 'new' | null

/** How a workspace file differs from the issue's starter, the way git marks a working tree. */
export function fileChange(starter: Record<string, string>, file: WorkspaceFile): FileChange {
  if (!(file.path in starter)) return 'new'
  return starter[file.path] === file.content ? null : 'modified'
}
