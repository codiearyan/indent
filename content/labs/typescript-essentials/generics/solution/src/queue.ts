// Task: A queue for any kind of job
//
// - Export a generic interface Queue<T> with four methods:
//     add(item: T): void     puts an item at the back
//     next(): T | undefined  removes and returns the item at the front
//     peek(): T | undefined  returns the item at the front without removing it
//     size(): number         how many items are waiting
// - createQueue(initial) returns a Queue holding the initial items in order. initial is
//   optional and defaults to an empty list. The item type is inferred from initial, so
//   createQueue([1, 2]) is a Queue<number>. The array passed in is never changed.
export interface Queue<T> {
  add(item: T): void
  next(): T | undefined
  peek(): T | undefined
  size(): number
}

export function createQueue<T>(initial: readonly T[] = []): Queue<T> {
  const items = [...initial]
  return {
    add: (item) => {
      items.push(item)
    },
    next: () => items.shift(),
    peek: () => items[0],
    size: () => items.length
  }
}
