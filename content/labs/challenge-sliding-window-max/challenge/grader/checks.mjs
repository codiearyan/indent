import { isDeepStrictEqual } from 'node:util'
import { LARGE, build, fingerprint } from './inputs.mjs'
import { windowMax } from '../solution/src/windowMax.ts'
import { longestWithin } from '../solution/src/longestWithin.ts'

const LIMIT_MS = 1000
const solutions = { windowMax, longestWithin }
const LABELS = { random: 'random', falling: 'falling', rising: 'rising', walk: 'slowly wandering' }

async function runCases(t, { file, name, cases, large = [] }) {
  const dir = await t.sandbox({
    '.grader/drive.mjs': t.chapterPath('grader/drive.mjs'),
    '.grader/inputs.mjs': t.chapterPath('grader/inputs.mjs')
  })
  const [runs, bigRuns, types] = await Promise.all([
    Promise.all(cases.map((c) => t.call(dir, '.grader/drive.mjs', 'small', [file, name, c.args]))),
    Promise.all(large.map((l) => t.call(dir, '.grader/drive.mjs', 'large', [file, name, l.input], { timeoutMs: 8000 }))),
    t.typecheck(dir, [file])
  ])
  const unwritten = [...runs, ...bigRuns].find((r) => !r.ok && /Not implemented/.test(r.error))
  if (unwritten) {
    return [
      {
        name: `${name} is implemented`,
        passed: false,
        message: `${name} still throws 'Not implemented'. Replace that line in ${file} with your code.`,
        output: unwritten.error
      }
    ]
  }
  return [
    ...cases.map((c, i) => {
      const r = runs[i]
      const right = r.ok && isDeepStrictEqual(r.value.result, c.expected)
      const passed = right && r.value.untouched
      return {
        name: c.name,
        passed,
        message: passed
          ? undefined
          : !r.ok
            ? `Your code threw an error here. ${c.hint}`
            : right
              ? 'The answer was right, but your function changed the array it was given. Work on indexes or a copy instead.'
              : c.hint,
        output: `${name}(${c.args.map((a) => JSON.stringify(a)).join(', ')}) -> ${r.ok ? JSON.stringify(r.value.result) : r.error}\nexpected ${JSON.stringify(c.expected)}`
      }
    }),
    ...large.map((l, i) => {
      const r = bigRuns[i]
      const { n, k, limit } = LARGE[l.input]
      const expected = fingerprint(solutions[name](build(l.input), k ?? limit))
      const right = r.ok && isDeepStrictEqual(r.value.result, expected)
      const fast = r.ok && r.value.ms <= LIMIT_MS
      return {
        name: l.name,
        passed: right && fast,
        message: !r.ok
          ? `The large run did not finish. ${l.hint}`
          : !right
            ? 'On a large input the answer was wrong. Try the small cases above and the demo to find the difference.'
            : !fast
              ? `The large run took ${r.value.ms} ms. ${l.hint}`
              : undefined,
        output: `${name} on ${n} ${LABELS[l.input]} numbers, ${k ? `k = ${k}` : `limit = ${limit}`}\n` +
          (r.ok ? `got ${JSON.stringify(r.value.result)} in ${r.value.ms} ms (limit ${LIMIT_MS} ms)` : r.error) +
          `\nexpected ${JSON.stringify(expected)}`
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

const RESCAN = 'Looking at every number in the window again, even only when the maximum leaves it, is O(n * k). Keep a deque of candidates instead.'

export const checks = {
  small(t) {
    return runCases(t, {
      file: 'src/windowMax.ts',
      name: 'windowMax',
      cases: [
        { name: 'Finds the maximum of each window', args: [[4, 2, 12, 3, 8, 5, 1], 3], expected: [12, 12, 12, 8, 8], hint: 'There is one window starting at each index from 0 to nums.length - k.' },
        { name: 'Windows of one', args: [[5, -2, 7], 1], expected: [5, -2, 7], hint: 'With k = 1 every number is its own window.' },
        { name: 'One window covering everything', args: [[3, 9, 4], 3], expected: [9], hint: 'With k = nums.length there is exactly one window.' },
        { name: 'k larger than the array', args: [[3, 9], 5], expected: [], hint: 'When there is no full window the answer is an empty array.' },
        { name: 'Empty array', args: [[], 2], expected: [], hint: 'An empty array has no windows.' },
        { name: 'Negative numbers', args: [[-5, -1, -3, -8, -2], 2], expected: [-1, -1, -3, -2], hint: 'If you start your maximum at 0, negative windows go wrong. Start from a number in the window or -Infinity.' },
        { name: 'Repeated values', args: [[7, 7, 3, 7, 2, 2], 3], expected: [7, 7, 7, 7], hint: 'Equal values can be the maximum several times in a row.' }
      ]
    })
  },

  linear(t) {
    return runCases(t, {
      file: 'src/windowMax.ts',
      name: 'windowMax',
      cases: [
        { name: 'Repeated values leave the window one at a time', args: [[2, 2, 2, 1, 1], 2], expected: [2, 2, 2, 1], hint: 'When the front of your deque leaves the window, check by index, not by value.' },
        { name: 'A maximum stays while smaller values come and go', args: [[1, 3, 3, 1, 0, 4], 2], expected: [3, 3, 3, 1, 4], hint: 'A new value removes the smaller candidates behind it. Values that are not smaller may stay.' }
      ],
      large: [
        { name: 'Linear on a million random numbers', input: 'random', hint: RESCAN },
        { name: 'Linear on a million falling numbers', input: 'falling', hint: RESCAN },
        { name: 'Linear on a million rising numbers', input: 'rising', hint: RESCAN }
      ]
    })
  },

  limit(t) {
    return runCases(t, {
      file: 'src/longestWithin.ts',
      name: 'longestWithin',
      cases: [
        { name: 'Finds the longest stretch', args: [[12, 15, 11, 9, 14, 18, 17, 10, 13], 4], expected: 3, hint: 'A stretch qualifies when its maximum minus its minimum is at most limit.' },
        { name: 'Limit 0 means equal values', args: [[5, 5, 2, 2, 2, 7], 0], expected: 3, hint: 'With limit 0 only runs of equal numbers qualify.' },
        { name: 'The whole array can qualify', args: [[3, 4, 5, 4, 3], 2], expected: 5, hint: 'Make sure the stretch can reach the last index.' },
        { name: 'A single number', args: [[42], 0], expected: 1, hint: 'A single number is a stretch of length 1, whatever the limit.' },
        { name: 'Empty array', args: [[], 5], expected: 0, hint: 'An empty array has no stretch at all.' },
        { name: 'Negative numbers', args: [[-3, -1, -2, 4, -1, -2], 2], expected: 3, hint: 'Subtracting a negative minimum adds. Check your maximum and minimum start from numbers in the stretch.' },
        { name: 'The stretch shrinks from its start', args: [[10, 1, 2, 3, 4, 10], 3], expected: 4, hint: 'When the stretch is too wide, move its start forward and drop deque fronts whose index fell out of the stretch.' }
      ],
      large: [{ name: 'Linear on a million numbers', input: 'walk', hint: 'Recomputing the maximum and minimum of the stretch after every step is O(n * length). Keep one deque for the maximum and one for the minimum.' }]
    })
  }
}
