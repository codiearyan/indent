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
  private entries = new Map<K, { value: V; expiresAt: number }>()
  private capacity: number
  private ttlMs: number
  private now: () => number

  constructor({ capacity, ttlMs, now = Date.now }: TTLOptions) {
    this.capacity = capacity
    this.ttlMs = ttlMs
    this.now = now
  }

  private live(key: K): { value: V; expiresAt: number } | undefined {
    const entry = this.entries.get(key)
    if (entry && this.now() >= entry.expiresAt) {
      this.entries.delete(key)
      return undefined
    }
    return entry
  }

  private purge(): void {
    for (const key of [...this.entries.keys()]) this.live(key)
  }

  get(key: K): V | undefined {
    const entry = this.live(key)
    if (!entry) return undefined
    this.entries.delete(key)
    this.entries.set(key, entry)
    return entry.value
  }

  set(key: K, value: V): void {
    this.entries.delete(key)
    if (this.entries.size >= this.capacity) this.purge()
    if (this.entries.size >= this.capacity) {
      this.entries.delete(this.entries.keys().next().value as K)
    }
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs })
  }

  has(key: K): boolean {
    return this.live(key) !== undefined
  }

  get size(): number {
    this.purge()
    return this.entries.size
  }

  keys(): K[] {
    this.purge()
    return [...this.entries.keys()]
  }
}
