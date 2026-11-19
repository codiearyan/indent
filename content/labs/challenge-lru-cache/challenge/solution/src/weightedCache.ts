// Task 3: Entries with a weight
//
// new WeightedCache<K, V>({ maxWeight, onEvict }) limits the total weight instead of the count.
// - set(key, value, weight) returns false and changes nothing when weight > maxWeight.
//   Otherwise it adds or replaces the entry with its new weight, makes it the most recently used,
//   then removes least recently used entries (never the one just set) until the total weight
//   is at most maxWeight, and returns true.
// - onEvict(key, value), when given, is called for each entry removed to make room, in the order
//   they are removed. Replacing a key or calling delete does not call it.
// - get(key) and has(key) work as in the LRU cache. delete(key) returns whether it was there.
// - size is the number of entries, weight the total weight, keys() least to most recently used.
export interface WeightedOptions<K, V> {
  maxWeight: number
  onEvict?: (key: K, value: V) => void
}

export class WeightedCache<K, V> {
  private entries = new Map<K, { value: V; weight: number }>()
  private total = 0
  private maxWeight: number
  private onEvict?: (key: K, value: V) => void

  constructor({ maxWeight, onEvict }: WeightedOptions<K, V>) {
    this.maxWeight = maxWeight
    this.onEvict = onEvict
  }

  get(key: K): V | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    this.entries.delete(key)
    this.entries.set(key, entry)
    return entry.value
  }

  set(key: K, value: V, weight: number): boolean {
    if (weight > this.maxWeight) return false
    this.delete(key)
    this.entries.set(key, { value, weight })
    this.total += weight
    while (this.total > this.maxWeight) {
      const [oldest, entry] = this.entries.entries().next().value as [K, { value: V; weight: number }]
      this.entries.delete(oldest)
      this.total -= entry.weight
      this.onEvict?.(oldest, entry.value)
    }
    return true
  }

  has(key: K): boolean {
    return this.entries.has(key)
  }

  delete(key: K): boolean {
    const entry = this.entries.get(key)
    if (!entry) return false
    this.entries.delete(key)
    this.total -= entry.weight
    return true
  }

  get size(): number {
    return this.entries.size
  }

  get weight(): number {
    return this.total
  }

  keys(): K[] {
    return [...this.entries.keys()]
  }
}
