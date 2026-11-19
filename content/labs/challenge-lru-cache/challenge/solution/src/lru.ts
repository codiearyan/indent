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
  readonly capacity: number
  // A Map iterates in insertion order, so re-inserting a key moves it to the most recent end.
  private entries = new Map<K, V>()

  constructor(capacity: number) {
    this.capacity = capacity
  }

  get(key: K): V | undefined {
    if (!this.entries.has(key)) return undefined
    const value = this.entries.get(key) as V
    this.entries.delete(key)
    this.entries.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    this.entries.delete(key)
    this.entries.set(key, value)
    if (this.entries.size > this.capacity) {
      this.entries.delete(this.entries.keys().next().value as K)
    }
  }

  has(key: K): boolean {
    return this.entries.has(key)
  }

  delete(key: K): boolean {
    return this.entries.delete(key)
  }

  get size(): number {
    return this.entries.size
  }

  keys(): K[] {
    return [...this.entries.keys()]
  }
}
