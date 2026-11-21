// Task: Helpers for any kind of list
//
// Make both functions generic, so the item type of the list flows into the result.
//
// - lastItem(items) returns the last item of the list, or undefined when it is empty.
// - chunk(items, size) splits the list into lists of size items, in order. The last chunk
//   holds whatever is left. A size below 1 throws an Error. The input list is not changed.
// - Both accept read-only arrays as input.
export function lastItem<T>(items: readonly T[]): T | undefined {
  return items[items.length - 1]
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size < 1) throw new Error(`Chunk size must be at least 1, got ${size}`)
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}
