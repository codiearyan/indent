// A fixed pseudo-random mix of gets and sets over twice as many keys as the cache holds.
export function stress(Cache, capacity, ops) {
  const cache = new Cache(capacity)
  let seed = 12345
  const next = () => (seed = (seed * 48271) % 2147483647)
  let hits = 0
  const started = performance.now()
  for (let i = 0; i < ops; i++) {
    const key = next() % (capacity * 2)
    if (next() % 3 === 0) cache.set(key, i)
    else if (cache.get(key) !== undefined) hits++
  }
  return { hits, size: cache.size, ms: Math.round(performance.now() - started) }
}
