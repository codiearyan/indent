// Task: The newest note, whatever it is attached to
//
// Notes, photos and messages all have an updatedAt timestamp and an id. These helpers work
// for any of them, and keep the full item type in their result.
//
// - latest(items) takes items that have at least updatedAt: number, and returns the one with
//   the largest updatedAt (the first of them on a tie), or undefined for an empty list.
// - findById(items, id) takes items that have at least id: string, and returns the item with
//   that id, or undefined.
// - Use a generic type parameter with an extends constraint for each.
export function latest<T extends { updatedAt: number }>(items: readonly T[]): T | undefined {
  let newest: T | undefined
  for (const item of items) {
    if (newest === undefined || item.updatedAt > newest.updatedAt) newest = item
  }
  return newest
}

export function findById<T extends { id: string }>(items: readonly T[], id: string): T | undefined {
  return items.find((item) => item.id === id)
}
