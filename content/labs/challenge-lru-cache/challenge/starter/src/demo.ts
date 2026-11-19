// Run with: node src/demo.ts
import { LRUCache } from './lru.ts'
import { TTLCache } from './ttlCache.ts'
import { WeightedCache } from './weightedCache.ts'

function show(label: string, run: () => unknown): void {
  try {
    console.log(label, JSON.stringify(run()))
  } catch (err) {
    console.log(label, `Error: ${(err as Error).message}`)
  }
}

show('LRU, capacity 2, set a b, get a, set c -> keys:', () => {
  const cache = new LRUCache<string, number>(2)
  cache.set('a', 1)
  cache.set('b', 2)
  cache.get('a')
  cache.set('c', 3)
  return cache.keys()
})

show('TTL 100ms, set a at 0 -> get at 99 and at 100:', () => {
  let time = 0
  const cache = new TTLCache<string, number>({ capacity: 2, ttlMs: 100, now: () => time })
  cache.set('a', 1)
  time = 99
  const before = cache.get('a')
  time = 100
  return [before, cache.get('a') ?? 'missing']
})

show('Weighted, max 10, set a:4 b:4 c:5 -> keys, weight, evicted:', () => {
  const evicted: string[] = []
  const cache = new WeightedCache<string, string>({ maxWeight: 10, onEvict: (key) => evicted.push(key) })
  cache.set('a', 'A', 4)
  cache.set('b', 'B', 4)
  cache.set('c', 'C', 5)
  return { keys: cache.keys(), weight: cache.weight, evicted }
})
