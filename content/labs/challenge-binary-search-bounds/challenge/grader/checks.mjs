import { isDeepStrictEqual } from 'node:util'

const LOG_N = 20

async function runCases(t, { file, fns, cases, budgets }) {
  const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
  const [runs, budgetRuns, types] = await Promise.all([
    Promise.all(cases.map((c) => t.call(dir, '.grader/drive.mjs', 'each', [file, c.fns ?? fns, c.items, c.target, !!c.byLength]))),
    Promise.all(budgets.map((b) => t.call(dir, '.grader/drive.mjs', 'budget', [file, b.fn, b.shape, b.targets], { timeoutMs: 10000 }))),
    t.typecheck(dir, [file])
  ])
  const unwritten = [...runs, ...budgetRuns].find((r) => !r.ok && /Not implemented/.test(r.error))
  if (unwritten) {
    return [
      {
        name: `${fns.join(' and ')} implemented`,
        passed: false,
        message: `A function this task calls still throws 'Not implemented'. Replace that line in ${file}, or in a file it imports, with your code.`,
        output: unwritten.error
      }
    ]
  }
  const call = (c, fn) => `${fn}(${JSON.stringify(c.items)}, ${JSON.stringify(c.target)}${c.byLength ? ', byLength' : ''})`
  return [
    ...cases.map((c, i) => {
      const r = runs[i]
      const passed = r.ok && isDeepStrictEqual(r.value, c.expected)
      return {
        name: c.name,
        passed,
        message: passed ? undefined : r.ok ? c.hint : `Your code threw an error here. ${c.hint}`,
        output: (c.fns ?? fns)
          .map((fn, j) => `${call(c, fn)} -> ${r.ok ? JSON.stringify(r.value[j]) : r.error}`)
          .join('\n') + `\nexpected ${JSON.stringify(c.expected)}`
      }
    }),
    ...budgets.map((b, i) => {
      const r = budgetRuns[i]
      const limit = b.perLog * LOG_N + b.perLog
      const right = r.ok && isDeepStrictEqual(r.value.results, b.expected)
      const cheap = r.ok && r.value.most <= limit
      return {
        name: `${b.fn} uses O(log n) comparisons on a million items`,
        passed: right && cheap,
        message: !r.ok
          ? `The large run did not finish. ${b.hint}`
          : !right
            ? 'On a large array of objects the answers were wrong. Compare values only through the compare function, never with === or indexOf.'
            : !cheap
              ? b.hint
              : undefined,
        output: r.ok
          ? `${b.fn} on ${r.value.length} items (${b.shape}), targets ${JSON.stringify(b.targets)}\n` +
            `got ${JSON.stringify(r.value.results)}, expected ${JSON.stringify(b.expected)}\n` +
            `most compare calls in one search: ${r.value.most} (limit ${limit})`
          : r.error
      }
    }),
    {
      name: `${file} type-checks`,
      passed: types.passed,
      message: types.passed ? undefined : `TypeScript reports errors in ${file}.`,
      output: types.output
    }
  ]
}

const LOOP_HINT = 'A loop that steps through items one at a time, even only across the duplicates, needs far more comparisons than halving the range each step.'

export const checks = {
  bounds(t) {
    return runCases(t, {
      file: 'src/bounds.ts',
      fns: ['lowerBound', 'upperBound'],
      cases: [
        { name: 'Finds both ends of a run of duplicates', items: [1, 2, 2, 2, 3], target: 2, expected: [1, 4], hint: 'lowerBound is the first 2, upperBound is just past the last 2.' },
        { name: 'A missing value gives its gap', items: [1, 3, 5, 7], target: 4, expected: [2, 2], hint: 'When target is not there, both bounds point at the first item larger than it.' },
        { name: 'Target before every item', items: [5, 6], target: 1, expected: [0, 0], hint: 'Every item is after the target, so both bounds are 0.' },
        { name: 'Target after every item', items: [5, 6], target: 9, expected: [2, 2], hint: 'When no item qualifies the answer is items.length, not -1 and not the last index.' },
        { name: 'Empty array', items: [], target: 3, expected: [0, 0], hint: 'An empty array has length 0. Make sure the loop does not read items[0].' },
        { name: 'Every item equals target', items: [4, 4, 4], target: 4, expected: [0, 3], hint: 'Bounds can sit at the very start and the very end.' },
        { name: 'Strings with the default order', items: ['apple', 'banana', 'banana', 'cherry'], target: 'banana', expected: [1, 3], hint: 'Without a compare function the default order should work for strings as well as numbers.' },
        { name: 'Uses the compare function it is given', items: ['a', 'bb', 'cc', 'dd', 'eee'], target: 'zz', byLength: true, expected: [1, 4], hint: "These strings are sorted by length and compared by length. Use compare instead of < so 'zz' counts as equal to 'bb'." }
      ],
      budgets: [
        { fn: 'lowerBound', shape: 'triples', targets: [100000, -5, 333332, 333333, 50000.5], expected: [300000, 0, 999996, 999999, 150003], perLog: 2, hint: LOOP_HINT },
        { fn: 'upperBound', shape: 'triples', targets: [100000, -5, 333332, 333333, 50000.5], expected: [300003, 0, 999999, 999999, 150003], perLog: 2, hint: LOOP_HINT }
      ]
    })
  },

  count(t) {
    return runCases(t, {
      file: 'src/count.ts',
      fns: ['countOccurrences', 'insertPosition'],
      cases: [
        { name: 'Counts duplicates', fns: ['countOccurrences'], items: [1, 2, 2, 2, 3], target: 2, expected: [3], hint: 'The count of a value is the distance between its two bounds.' },
        { name: 'Counts a missing value as 0', fns: ['countOccurrences'], items: [1, 3, 5], target: 4, expected: [0], hint: 'A value that is not there occurs 0 times.' },
        { name: 'Counts in a uniform array', fns: ['countOccurrences'], items: [7, 7, 7, 7], target: 7, expected: [4], hint: 'When every item equals the target, the count is the whole length.' },
        { name: 'Inserts after equal items', fns: ['insertPosition'], items: [1, 2, 2, 3], target: 2, expected: [3], hint: 'A new item equal to existing ones goes after them, so arrival order is kept.' },
        { name: 'Inserts before every item', fns: ['insertPosition'], items: [1, 3], target: 0, expected: [0], hint: 'A value smaller than everything goes at index 0.' },
        { name: 'Inserts past the last item', fns: ['insertPosition', 'countOccurrences'], items: [1, 3], target: 5, expected: [2, 0], hint: 'A value larger than everything goes at items.length.' },
        { name: 'Handles an empty array', fns: ['insertPosition', 'countOccurrences'], items: [], target: 5, expected: [0, 0], hint: 'An empty array has one insert position, 0, and no occurrences.' },
        { name: 'Uses the compare function it is given', fns: ['insertPosition', 'countOccurrences'], items: ['a', 'bb', 'cc', 'ddd'], target: 'xx', byLength: true, expected: [3, 2], hint: 'Pass compare through to every search so the order is the one the caller chose.' }
      ],
      budgets: [
        { fn: 'countOccurrences', shape: 'halves', targets: [1, 0, 2, 3, -1], expected: [500000, 250000, 250000, 0, 0], perLog: 4, hint: LOOP_HINT },
        { fn: 'insertPosition', shape: 'halves', targets: [1, 0.5, 2, -1], expected: [750000, 250000, 1000000, 0], perLog: 4, hint: LOOP_HINT }
      ]
    })
  },

  rotated(t) {
    return runCases(t, {
      file: 'src/rotated.ts',
      fns: ['searchRotated'],
      cases: [
        { name: 'Works when not rotated', items: [1, 3, 5, 7, 9], target: 7, expected: [3], hint: 'A rotation of 0 leaves a plain sorted array. Your search must handle it too.' },
        { name: 'Finds a value after the rotation point', items: [7, 9, 1, 3, 5], target: 3, expected: [3], hint: 'At each step, one of the two halves around the middle is sorted. Decide whether the target can be in that half.' },
        { name: 'Finds a value before the rotation point', items: [7, 9, 1, 3, 5], target: 9, expected: [1], hint: 'The largest value sits just before the smallest. Check the half you throw away really cannot hold the target.' },
        { name: 'Finds the smallest value', items: [9, 1, 3, 5, 7], target: 1, expected: [1], hint: 'The rotation point itself is a common place for an off-by-one.' },
        { name: 'Returns -1 for a missing value', items: [7, 9, 1, 3, 5], target: 4, expected: [-1], hint: 'When the range becomes empty, the value is not there.' },
        { name: 'Handles two items', items: [3, 1], target: 1, expected: [1], hint: 'With two items, low and mid are the same index. Use <= when you test whether the left half is sorted.' },
        { name: 'Handles one item', items: [5], target: 5, expected: [0], hint: 'With one item, low, mid and high are all 0. Make sure the loop runs at least once.' },
        { name: 'Handles an empty array', items: [], target: 5, expected: [-1], hint: 'An empty array contains nothing. Make sure the loop does not read items[0].' },
        { name: 'Uses the compare function it is given', items: ['ccc', 'dddd', 'a', 'bb'], target: 'xx', byLength: true, expected: [3], hint: 'These strings are sorted by length, then rotated. Use compare for every comparison.' }
      ],
      budgets: [
        { fn: 'searchRotated', shape: 'rotated', targets: [0, 1274842, 1999998, 1000000, 777, 2000000, -2], expected: [362579, 0, 362578, 862579, -1, -1, -1], perLog: 6, hint: 'Finding the rotation point by walking the array is O(n). Halve the range on every step instead.' }
      ]
    })
  }
}
