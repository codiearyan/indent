import type { WorkspaceFile } from '@shared/types'

// A refresh returns new arrays and objects even when nothing on disk changed. Handing the store
// back what it already holds keeps every selector on it from rendering again.

/** `previous` when both hold the same values in the same order, otherwise `next`. */
export function keepList<T>(previous: T[], next: T[]): T[] {
  return previous.length === next.length && previous.every((value, i) => value === next[i])
    ? previous
    : next
}

/** `previous` when both have the same keys and values, otherwise `next`. */
export function keepRecord<T>(
  previous: Record<string, T>,
  next: Record<string, T>
): Record<string, T> {
  const keys = Object.keys(next)
  return keys.length === Object.keys(previous).length &&
    keys.every((key) => Object.hasOwn(previous, key) && previous[key] === next[key])
    ? previous
    : next
}

/** `next`, with each file that did not change kept as the object the store already holds. */
export function keepFiles(previous: WorkspaceFile[], next: WorkspaceFile[]): WorkspaceFile[] {
  const held = new Map(previous.map((file) => [file.path, file]))
  return keepList(
    previous,
    next.map((file) => {
      const old = held.get(file.path)
      return old?.content === file.content ? old : file
    })
  )
}
