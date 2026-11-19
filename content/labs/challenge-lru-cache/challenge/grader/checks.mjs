import { isDeepStrictEqual } from 'node:util'
import { stress } from './stress.mjs'
import { LRUCache } from '../solution/src/lru.ts'

const STRESS_CAPACITY = 100000
const STRESS_OPS = 600000
const STRESS_LIMIT_MS = 2500

const s = (method, ...args) => [0, method, ...args]
const at = (time, method, ...args) => [time, method, ...args]

function describe(steps, value) {
  const results = Array.isArray(value) ? value : value?.results
  const lines = steps.map(([time, method, ...args], i) => {
    const call = `${method}${args.length ? `(${args.map((a) => JSON.stringify(a)).join(', ')})` : ''}`
    return `t=${time}ms ${call} -> ${JSON.stringify(results?.[i] ?? null)}`
  })
  if (value?.evicted) lines.push(`onEvict calls: ${JSON.stringify(value.evicted)}`)
  return lines.join('\n')
}

async function runScenarios(t, { file, className, scenarios, extra = [] }) {
  const dir = await t.sandbox({
    '.grader/drive.mjs': t.chapterPath('grader/drive.mjs'),
    '.grader/stress.mjs': t.chapterPath('grader/stress.mjs')
  })
  const [runs, types, ...extras] = await Promise.all([
    Promise.all(
      scenarios.map((sc) => t.call(dir, '.grader/drive.mjs', 'replay', [file, className, sc.options, sc.steps]))
    ),
    t.typecheck(dir, [file]),
    ...extra.map((run) => run(t, dir))
  ])
  const unwritten = runs.find((r) => !r.ok && /Not implemented/.test(r.error))
  if (unwritten) {
    return [
      {
        name: `${className} is implemented`,
        passed: false,
        message: `${className} still throws 'Not implemented'. Replace those lines with your code.`,
        output: unwritten.error
      }
    ]
  }
  return [
    ...scenarios.map((sc, i) => {
      const r = runs[i]
      const passed = r.ok && isDeepStrictEqual(r.value, sc.expected)
      return {
        name: sc.name,
        passed,
        message: passed ? undefined : r.ok ? sc.hint : `Your code threw an error in this scenario. ${sc.hint}`,
        output: `new ${className}(${JSON.stringify(sc.options)})\n${r.ok ? describe(sc.steps, r.value) : r.error}`
      }
    }),
    ...extras,
    {
      name: `${file} type-checks`,
      passed: types.passed,
      message: types.passed ? undefined : `TypeScript reports errors in ${file}. Remember that Node runs it directly: no enums, no parameter properties.`,
      output: types.output
    }
  ]
}

async function stressCheck(t, dir) {
  const expected = stress(LRUCache, STRESS_CAPACITY, STRESS_OPS)
  const r = await t.call(dir, '.grader/drive.mjs', 'stressRun', ['src/lru.ts', STRESS_CAPACITY, STRESS_OPS], {
    timeoutMs: 20000
  })
  const same = r.ok && r.value.hits === expected.hits && r.value.size === expected.size
  const fast = r.ok && r.value.ms <= STRESS_LIMIT_MS
  return {
    name: `Stays fast with ${STRESS_CAPACITY} entries`,
    passed: same && fast,
    message: !r.ok
      ? 'The large run did not finish. Some operation is slower than O(1): look for loops, indexOf, splice or sorting inside get and set.'
      : !same
        ? 'The large run finished but kept different entries than a correct cache would. Check eviction when keys are numbers and values are reused.'
        : !fast
          ? `The large run took ${r.value.ms} ms. Some operation is slower than O(1): look for loops, indexOf, splice or sorting inside get and set.`
          : undefined,
    output: r.ok ? `${STRESS_OPS} operations: ${r.value.hits} hits, final size ${r.value.size}, ${r.value.ms} ms` : r.error
  }
}

export const checks = {
  lru(t) {
    return runScenarios(t, {
      file: 'src/lru.ts',
      className: 'LRUCache',
      extra: [stressCheck],
      scenarios: [
        {
          name: 'Evicts the least recently used entry',
          options: { capacity: 2 },
          steps: [s('set', 'a', 1), s('set', 'b', 2), s('set', 'c', 3), s('has', 'a'), s('get', 'b'), s('get', 'c'), s('keys')],
          expected: [null, null, null, false, 2, 3, ['b', 'c']],
          hint: 'When a third entry goes into a cache of two, the one used longest ago should leave.'
        },
        {
          name: 'get makes a key the most recently used',
          options: { capacity: 2 },
          steps: [s('set', 'a', 1), s('set', 'b', 2), s('get', 'a'), s('set', 'c', 3), s('get', 'b'), s('keys')],
          expected: [null, null, 1, null, null, ['a', 'c']],
          hint: 'Reading a key counts as using it. Check that get moves the key to the recent end.'
        },
        {
          name: 'set on an existing key replaces and refreshes it',
          options: { capacity: 2 },
          steps: [s('set', 'a', 1), s('set', 'b', 2), s('set', 'a', 10), s('size'), s('set', 'c', 3), s('keys'), s('get', 'a')],
          expected: [null, null, null, 2, null, ['a', 'c'], 10],
          hint: 'Setting a key that is already there should not add a second entry, and it counts as a use.'
        },
        {
          name: 'has does not change the order',
          options: { capacity: 2 },
          steps: [s('set', 'a', 1), s('set', 'b', 2), s('has', 'a'), s('set', 'c', 3), s('keys')],
          expected: [null, null, true, null, ['b', 'c']],
          hint: 'has only answers a question. It should not count as a use.'
        },
        {
          name: 'Handles missing keys, falsy values and delete',
          options: { capacity: 3 },
          steps: [s('get', 'x'), s('set', 'x', 0), s('get', 'x'), s('has', 'x'), s('delete', 'x'), s('delete', 'x'), s('size')],
          expected: [null, null, 0, true, true, false, 0],
          hint: 'A stored 0 is still stored. delete returns whether the key was there.'
        },
        {
          name: 'Works with capacity 1',
          options: { capacity: 1 },
          steps: [s('set', 'a', 1), s('set', 'b', 2), s('keys'), s('get', 'a')],
          expected: [null, null, ['b'], null],
          hint: 'With room for one entry, every new key replaces the previous one.'
        }
      ]
    })
  },

  ttl(t) {
    return runScenarios(t, {
      file: 'src/ttlCache.ts',
      className: 'TTLCache',
      scenarios: [
        {
          name: 'An entry expires after ttlMs',
          options: { capacity: 3, ttlMs: 100 },
          steps: [at(0, 'set', 'a', 1), at(99, 'get', 'a'), at(100, 'get', 'a'), at(100, 'has', 'a')],
          expected: [null, 1, null, false],
          hint: 'An entry set at time t is gone from exactly t + ttlMs. Check the boundary of your comparison.'
        },
        {
          name: 'get does not extend the time',
          options: { capacity: 3, ttlMs: 100 },
          steps: [at(0, 'set', 'a', 1), at(60, 'get', 'a'), at(110, 'get', 'a')],
          expected: [null, 1, null],
          hint: 'Reading an entry makes it recently used, but its expiry still counts from when it was set.'
        },
        {
          name: 'Setting a key again restarts its time',
          options: { capacity: 3, ttlMs: 100 },
          steps: [at(0, 'set', 'a', 1), at(80, 'set', 'a', 2), at(150, 'get', 'a'), at(180, 'get', 'a')],
          expected: [null, null, 2, null],
          hint: 'A new set stores a new value with a fresh expiry.'
        },
        {
          name: 'size and keys skip expired entries',
          options: { capacity: 3, ttlMs: 100 },
          steps: [at(0, 'set', 'a', 1), at(50, 'set', 'b', 2), at(120, 'size'), at(120, 'keys')],
          expected: [null, null, 1, ['b']],
          hint: 'An expired entry should not be counted or listed, even if nobody asked for it since.'
        },
        {
          name: 'Removes expired entries before live ones',
          options: { capacity: 2, ttlMs: 100 },
          steps: [at(0, 'set', 'a', 1), at(50, 'set', 'b', 2), at(60, 'get', 'a'), at(120, 'set', 'c', 3), at(120, 'has', 'b'), at(120, 'keys')],
          expected: [null, null, 1, null, true, ['b', 'c']],
          hint: 'When the cache is full, an expired entry should make room before any live entry is evicted, even if the expired one was used more recently.'
        },
        {
          name: 'Evicts the least recently used live entry',
          options: { capacity: 2, ttlMs: 100 },
          steps: [at(0, 'set', 'a', 1), at(10, 'set', 'b', 2), at(20, 'get', 'a'), at(30, 'set', 'c', 3), at(30, 'has', 'b'), at(30, 'keys')],
          expected: [null, null, 1, null, false, ['a', 'c']],
          hint: 'With nothing expired, the cache behaves like the LRU cache from task 1.'
        }
      ]
    })
  },

  weighted(t) {
    return runScenarios(t, {
      file: 'src/weightedCache.ts',
      className: 'WeightedCache',
      scenarios: [
        {
          name: 'Evicts by total weight',
          options: { maxWeight: 10 },
          steps: [s('set', 'a', 'A', 4), s('set', 'b', 'B', 4), s('set', 'c', 'C', 5), s('keys'), s('weight')],
          expected: { results: [true, true, true, ['b', 'c'], 9], evicted: [['a', 'A']] },
          hint: 'After a set, remove the least recently used entries until the total weight fits, and tell onEvict about each one.'
        },
        {
          name: 'Evicts as many entries as needed, oldest first',
          options: { maxWeight: 10 },
          steps: [s('set', 'a', 'A', 3), s('set', 'b', 'B', 3), s('set', 'c', 'C', 3), s('set', 'd', 'D', 9), s('keys'), s('weight')],
          expected: { results: [true, true, true, true, ['d'], 9], evicted: [['a', 'A'], ['b', 'B'], ['c', 'C']] },
          hint: 'One heavy entry may push out several. Keep evicting until it fits, in order from least recently used.'
        },
        {
          name: 'Refuses an entry heavier than maxWeight',
          options: { maxWeight: 10 },
          steps: [s('set', 'a', 'A', 4), s('set', 'big', 'X', 11), s('set', 'a', 'A2', 12), s('keys'), s('get', 'a'), s('weight')],
          expected: { results: [true, false, false, ['a'], 'A', 4], evicted: [] },
          hint: 'An entry that can never fit returns false and leaves the cache exactly as it was, including any old value for that key.'
        },
        {
          name: 'Replacing a key updates its weight',
          options: { maxWeight: 10 },
          steps: [s('set', 'a', 'A', 4), s('set', 'b', 'B', 4), s('set', 'a', 'A2', 2), s('weight'), s('keys'), s('set', 'c', 'C', 5), s('keys')],
          expected: { results: [true, true, true, 6, ['b', 'a'], true, ['a', 'c']], evicted: [['b', 'B']] },
          hint: 'A replaced entry gives back its old weight, is not reported to onEvict, and becomes the most recently used.'
        },
        {
          name: 'get makes a key the most recently used',
          options: { maxWeight: 10 },
          steps: [s('set', 'a', 'A', 4), s('set', 'b', 'B', 4), s('get', 'a'), s('set', 'c', 'C', 4), s('keys')],
          expected: { results: [true, true, 'A', true, ['a', 'c']], evicted: [['b', 'B']] },
          hint: 'Reading a key counts as using it, so it should survive the next eviction.'
        },
        {
          name: 'delete and an entry of exactly maxWeight',
          options: { maxWeight: 10 },
          steps: [s('set', 'a', 'A', 4), s('delete', 'a'), s('delete', 'a'), s('weight'), s('set', 'b', 'B', 10), s('set', 'c', 'C', 1), s('keys'), s('size')],
          expected: { results: [true, true, false, 0, true, true, ['c'], 1], evicted: [['b', 'B']] },
          hint: 'delete gives back the weight without calling onEvict. An entry of exactly maxWeight fits.'
        }
      ]
    })
  }
}
