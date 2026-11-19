// Copied into the sandbox as .grader/. Replays calls against the learner's class with a fake clock.
// steps: [atMs, method, ...args]; size and weight are read as getters.
import { stress } from './stress.mjs'

const load = async (file) => import(new URL(`../${file}`, import.meta.url).href)

export async function replay(file, className, options, steps) {
  const Cache = (await load(file))[className]
  let time = 0
  const evicted = []
  const cache =
    className === 'LRUCache'
      ? new Cache(options.capacity)
      : new Cache({ ...options, now: () => time, onEvict: (key, value) => evicted.push([key, value]) })
  const results = steps.map(([at, method, ...args]) => {
    time = at
    return typeof cache[method] === 'function' ? cache[method](...args) : cache[method]
  })
  return className === 'WeightedCache' ? { results, evicted } : results
}

export async function stressRun(file, capacity, ops) {
  return stress((await load(file)).LRUCache, capacity, ops)
}
