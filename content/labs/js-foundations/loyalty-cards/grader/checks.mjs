import { isDeepStrictEqual } from 'node:util'

async function runCases(t, fn, cases) {
  const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
  const runs = await Promise.all(cases.map((c) => t.call(dir, '.grader/drive.mjs', c.run, c.args)))
  const unwritten = runs.find((r) => !r.ok && /Not implemented/.test(r.error))
  if (unwritten) {
    return [
      {
        name: `${fn} is implemented`,
        passed: false,
        message: `${fn} still throws 'Not implemented'. Replace that line with your code.`,
        output: unwritten.error
      }
    ]
  }
  return cases.map((c, i) => {
    const r = runs[i]
    const passed = r.ok && isDeepStrictEqual(r.value, c.expected)
    return {
      name: c.name,
      passed,
      message: passed ? undefined : r.ok ? c.hint : `Your code threw an error here. ${c.hint}`,
      output: `${c.setup}\n${r.ok ? `got ${JSON.stringify(r.value)}` : r.error}`
    }
  })
}

export const checks = {
  stamp(t) {
    return runCases(t, 'createStampCard', [
      {
        name: 'Gives a free candle on the goal stamp',
        run: 'stampRun',
        args: [3, 3],
        expected: { results: [false, false, true], stamps: 0 },
        setup: 'createStampCard(3), stamp() 3 times, then stamps()',
        hint: 'stamp() should return true exactly when the card reaches the goal, and the card then starts again from 0.'
      },
      {
        name: 'Starts a new round after a reward',
        run: 'stampRun',
        args: [2, 5],
        expected: { results: [false, true, false, true, false], stamps: 1 },
        setup: 'createStampCard(2), stamp() 5 times, then stamps()',
        hint: 'After a free candle the count should go back to 0 and keep counting from there.'
      },
      {
        name: 'Counts stamps before the goal',
        run: 'stampRun',
        args: [10, 4],
        expected: { results: [false, false, false, false], stamps: 4 },
        setup: 'createStampCard(10), stamp() 4 times, then stamps()',
        hint: 'stamps() should report how many stamps the card holds right now.'
      },
      {
        name: 'Each card keeps its own count',
        run: 'twoCards',
        args: [],
        expected: { a: 3, b: 1 },
        setup: 'two cards with goal 4: card a stamped 3 times, card b once',
        hint: 'Stamping one card changed another. Where does your count live? Each call to createStampCard needs its own.'
      }
    ])
  },

  memo(t) {
    return runCases(t, 'memoize', [
      {
        name: 'Calls fn once for a repeated argument',
        run: 'memoRun',
        args: ['label', [3, 3, 3]],
        expected: { results: [6, 6, 6], calls: [3] },
        setup: "memoized fn called with 3, 3, 3 (calls lists every time fn really ran)",
        hint: 'The second and third call should reuse the saved result instead of calling fn again.'
      },
      {
        name: 'Keeps different arguments apart',
        run: 'memoRun',
        args: ['label', [1, '1', 1, '1', 2]],
        expected: { results: [2, '1!', 2, '1!', 4], calls: [1, '1', 2] },
        setup: "memoized fn called with 1, '1', 1, '1', 2",
        hint: "The number 1 and the string '1' are different arguments. Think about what happens to keys of a plain object."
      },
      {
        name: 'Saves a result of 0',
        run: 'memoRun',
        args: ['zero', ['a', 'a', 'a']],
        expected: { results: [0, 0, 0], calls: ['a'] },
        setup: "memoized fn that returns 0, called with 'a' three times",
        hint: 'fn ran more than once when its result was 0. Check how you decide whether a result is already saved.'
      },
      {
        name: 'Saves a result of undefined',
        run: 'memoRun',
        args: ['nothing', ['x', 'x']],
        expected: { results: [null, null], calls: ['x'] },
        setup: "memoized fn that returns undefined, called with 'x' twice (undefined shows as null)",
        hint: 'A saved undefined still counts as saved. Asking whether a key exists is different from reading its value.'
      },
      {
        name: 'Each memoized function has its own memory',
        run: 'twoMemos',
        args: [],
        expected: [10, 25, 10, 25],
        setup: 'double = memoize(x => x * 2), square = memoize(x => x * x), then double(5), square(5), double(5), square(5)',
        hint: 'Two memoized functions shared answers. Where is your memory created?'
      }
    ])
  },

  once(t) {
    return runCases(t, 'once', [
      {
        name: 'Runs fn the first time with the arguments',
        run: 'onceRun',
        args: ['sum', [[2, 3]]],
        expected: { results: [5], calls: [[2, 3]] },
        setup: 'once(fn) called with (2, 3), where fn adds its arguments',
        hint: 'The first call should pass every argument through to fn and return its result.'
      },
      {
        name: 'Later calls return the first result',
        run: 'onceRun',
        args: ['sum', [[1, 1], [10, 10], [5]]],
        expected: { results: [2, 2, 2], calls: [[1, 1]] },
        setup: 'once(fn) called with (1, 1), then (10, 10), then (5)',
        hint: 'After the first call fn should never run again, and new arguments should not change the answer.'
      },
      {
        name: 'Still only once when fn returns undefined',
        run: 'onceRun',
        args: ['nothing', [[], [], []]],
        expected: { results: [null, null, null], calls: [[]] },
        setup: 'once(fn) called three times, where fn returns undefined (shows as null)',
        hint: 'fn ran again because its result was undefined. Remember that the call happened, not just what it returned.'
      },
      {
        name: 'Each wrapped function is separate',
        run: 'twoOnces',
        args: [],
        expected: ['a', 'b', 'a', 'b'],
        setup: "a = once(() => 'a'), b = once(() => 'b'), then a(), b(), a(), b()",
        hint: 'Two functions made by once shared their state. Each call to once needs its own.'
      }
    ])
  }
}
