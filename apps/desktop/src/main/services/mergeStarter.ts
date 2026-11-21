export type Files = Record<string, string>

const get = (files: Files, path: string): string | undefined =>
  Object.hasOwn(files, path) ? files[path] : undefined

export interface MergePlan {
  /** Paths to take from the new starter. */
  writes: string[]
  /** Paths to remove from the workspace. */
  deletes: string[]
  /** Paths the learner changed that the repo changed too; the learner's file stays as it is. */
  conflicts: string[]
  /** The starter to remember from now on. */
  starter: Files
}

/**
 * Brings a workspace from the starter it was given (`old`) to the repo's current one (`next`),
 * looking at the learner's files (`mine`, only the paths of either starter). A file the learner
 * never touched follows the repo; one they changed is never written. Conflicted paths keep their
 * old remembered content, so the next open still sees them as conflicts.
 */
export function planMerge(old: Files, next: Files, mine: Files): MergePlan {
  const writes: string[] = []
  const deletes: string[] = []
  const conflicts: string[] = []
  const paths = [...new Set([...Object.keys(old), ...Object.keys(next)])].sort()
  for (const path of paths) {
    const before = get(old, path)
    const after = get(next, path)
    const current = get(mine, path)
    if (before === after || current === after) continue
    if (current !== before) conflicts.push(path)
    else if (after === undefined) deletes.push(path)
    else writes.push(path)
  }
  const starter = { ...next }
  for (const path of conflicts) {
    if (Object.hasOwn(old, path)) starter[path] = old[path]
    else delete starter[path]
  }
  return { writes, deletes, conflicts, starter }
}
