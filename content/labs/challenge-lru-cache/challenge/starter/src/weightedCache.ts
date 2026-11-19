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
  constructor(options: WeightedOptions<K, V>) {
    throw new Error('Not implemented')
  }

  get(key: K): V | undefined {
    throw new Error('Not implemented')
  }

  set(key: K, value: V, weight: number): boolean {
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

  get weight(): number {
    throw new Error('Not implemented')
  }

  keys(): K[] {
    throw new Error('Not implemented')
  }
}
