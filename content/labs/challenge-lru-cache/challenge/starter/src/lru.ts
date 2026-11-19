// Task 1: LRU cache
//
// new LRUCache<K, V>(capacity) holds at most `capacity` entries (capacity >= 1).
// - get(key): the value, or undefined when missing. A hit makes the key the most recently used.
// - set(key, value): adds or replaces the value and makes the key the most recently used.
//   When that leaves more than `capacity` entries, remove the least recently used one.
// - has(key): whether the key is stored. Does not change the order.
// - delete(key): removes the key, returns whether it was there.
// - size: the number of entries.
// - keys(): every key, from least to most recently used.
// Every operation except keys() must run in O(1) average time: the check runs hundreds of
// thousands of operations on a large cache.
export class LRUCache<K, V> {
  constructor(capacity: number) {
    throw new Error('Not implemented')
  }

  get(key: K): V | undefined {
    throw new Error('Not implemented')
  }

  set(key: K, value: V): void {
    throw new Error('Not implemented')
  }

  has(key: K): boolean {
    throw new Error('Not implemented')
  }

  delete(key: K): boolean {
    throw new Error('Not implemented')
  }

  get size(): number {
    throw new Error('Not implemented')
  }

  keys(): K[] {
    throw new Error('Not implemented')
  }
}
