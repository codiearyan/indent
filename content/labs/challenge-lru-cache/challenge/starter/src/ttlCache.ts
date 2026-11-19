// Task 2: Entries that expire
//
// new TTLCache<K, V>({ capacity, ttlMs, now }) works like an LRU cache, plus:
// - set(key, value) stores the entry until now() + ttlMs. Setting a key again restarts its time.
// - An entry is expired once now() >= the time it was set + ttlMs. Expired entries act as if
//   they were not there: get returns undefined, has returns false, size does not count them.
// - get(key) on a live entry makes it the most recently used. It does not extend its time.
// - When set adds a new key to a full cache, expired entries are removed first. Only if the
//   cache is still full is the least recently used live entry removed.
// - `now` returns the current time in milliseconds. It defaults to Date.now.
export interface TTLOptions {
  capacity: number
  ttlMs: number
  now?: () => number
}

export class TTLCache<K, V> {
  constructor(options: TTLOptions) {
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

  get size(): number {
    throw new Error('Not implemented')
  }

  keys(): K[] {
    throw new Error('Not implemented')
  }
}
