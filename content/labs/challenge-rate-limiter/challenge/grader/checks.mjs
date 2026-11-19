import { isDeepStrictEqual } from 'node:util'

const describe = (steps, value) =>
  steps
    .map(([at, method, ...args], i) => {
      const call = `${method}(${args.map((a) => JSON.stringify(a)).join(', ')})`
      return `t=${at}ms ${call} -> ${Array.isArray(value) ? JSON.stringify(value[i]) : '?'}`
    })
    .join('\n')

// Replays each hidden scenario against a fake clock and compares every answer.
async function runScenarios(t, { file, factory, scenarios }) {
  const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
  const [runs, clock, types] = await Promise.all([
    Promise.all(
      scenarios.map((s) => t.call(dir, '.grader/drive.mjs', 'replay', [file, factory, s.options, s.steps]))
    ),
    t.call(dir, '.grader/drive.mjs', 'defaultClock', [
      file,
      factory,
      scenarios[0].options,
      scenarios[0].steps[0][1]
    ]),
    t.typecheck(dir, [file])
  ])
  const unwritten = runs.find((r) => !r.ok && /Not implemented/.test(r.error))
  if (unwritten) {
    return [
      {
        name: `${factory} is implemented`,
        passed: false,
        message: `${factory} still throws 'Not implemented'. Replace that line with your code.`,
        output: unwritten.error
      }
    ]
  }
  const details = scenarios.map((s, i) => {
    const r = runs[i]
    const passed = r.ok && isDeepStrictEqual(r.value, s.expected)
    return {
      name: s.name,
      passed,
      message: passed ? undefined : r.ok ? s.hint : `Your code threw an error in this scenario. ${s.hint}`,
      output: `${factory}(${JSON.stringify(s.options)}) with a fake clock\n${r.ok ? describe(s.steps, r.value) : r.error}`
    }
  })
  details.push(
    {
      name: 'Uses the real clock when no now is given',
      passed: clock.ok && clock.value !== null,
      message: clock.ok && clock.value !== null ? undefined : 'Without a now option the limiter should fall back to Date.now and still answer.',
      output: clock.ok ? JSON.stringify(clock.value) : clock.error
    },
    {
      name: `${file} type-checks`,
      passed: types.passed,
      message: types.passed ? undefined : `TypeScript reports errors in ${file}.`,
      output: types.output
    }
  )
  return details
}

const allow = (at, key = 'a') => [at, 'allow', key]
const take = (at, cost, key = 'a') => (cost === undefined ? [at, 'take', key] : [at, 'take', key, cost])
const tokens = (at, key = 'a') => [at, 'tokens', key]

export const checks = {
  fixed(t) {
    return runScenarios(t, {
      file: 'src/fixedWindow.ts',
      factory: 'createFixedWindowLimiter',
      scenarios: [
        {
          name: 'Allows up to the limit in one window',
          options: { limit: 3, windowMs: 1000 },
          steps: [allow(0), allow(10), allow(20), allow(30), allow(999)],
          expected: [true, true, true, false, false],
          hint: 'Within one window the first `limit` requests pass and the rest are refused.'
        },
        {
          name: 'Windows are aligned to multiples of windowMs',
          options: { limit: 2, windowMs: 1000 },
          steps: [allow(900), allow(950), allow(999), allow(1000), allow(1001), allow(1002)],
          expected: [true, true, false, true, true, false],
          hint: 'A window does not start at the first request. Work out which window a time belongs to from the time alone.'
        },
        {
          name: 'Counts each key separately',
          options: { limit: 1, windowMs: 1000 },
          steps: [allow(0, 'a'), allow(1, 'b'), allow(2, 'a'), allow(3, 'b')],
          expected: [true, true, false, false],
          hint: 'Each key has its own count. One caller should not use up another caller\'s requests.'
        },
        {
          name: 'Starts fresh after a long gap',
          options: { limit: 1, windowMs: 100 },
          steps: [allow(0), allow(50), allow(250), allow(260), allow(300)],
          expected: [true, false, true, false, true],
          hint: 'When the window changes, even skipping several windows, the count for that key starts again.'
        }
      ]
    })
  },

  sliding(t) {
    return runScenarios(t, {
      file: 'src/slidingWindow.ts',
      factory: 'createSlidingWindowLimiter',
      scenarios: [
        {
          name: 'Requests leave the window after windowMs',
          options: { limit: 2, windowMs: 1000 },
          steps: [allow(0), allow(100), allow(200), allow(999), allow(1000), allow(1050), allow(1100)],
          expected: [true, true, false, false, true, false, true],
          hint: 'A request made at time t stops counting at exactly t + windowMs. Check the boundary of your comparison.'
        },
        {
          name: 'Refused requests do not count',
          options: { limit: 1, windowMs: 1000 },
          steps: [allow(0), allow(500), allow(900), allow(1000)],
          expected: [true, false, false, true],
          hint: 'Only allowed requests are recorded. A caller who keeps getting refused should not be locked out longer.'
        },
        {
          name: 'No burst across a window edge',
          options: { limit: 2, windowMs: 1000 },
          steps: [allow(900), allow(950), allow(1000), allow(1899), allow(1900)],
          expected: [true, true, false, false, true],
          hint: 'The window slides with the current time. It is not reset on multiples of windowMs.'
        },
        {
          name: 'Counts each key separately',
          options: { limit: 1, windowMs: 1000 },
          steps: [allow(0, 'a'), allow(1, 'b'), allow(2, 'a'), allow(1001, 'b'), allow(1001, 'a')],
          expected: [true, true, false, true, true],
          hint: 'Each key needs its own record of recent requests.'
        }
      ]
    })
  },

  bucket(t) {
    return runScenarios(t, {
      file: 'src/tokenBucket.ts',
      factory: 'createTokenBucket',
      scenarios: [
        {
          name: 'A new bucket starts full',
          options: { capacity: 2, refillPerSecond: 2 },
          steps: [take(0), take(0), take(0), tokens(0)],
          expected: [true, true, false, 0],
          hint: 'A key seen for the first time has `capacity` tokens, and each take removes one.'
        },
        {
          name: 'Refills continuously over time',
          options: { capacity: 2, refillPerSecond: 2 },
          steps: [take(0), take(0), tokens(250), take(250), take(500), tokens(500)],
          expected: [true, true, 0.5, false, true, 0],
          hint: 'Tokens grow with the time passed since you last updated the bucket. Make sure time is not counted twice when tokens() is called in between.'
        },
        {
          name: 'Never holds more than capacity',
          options: { capacity: 3, refillPerSecond: 1 },
          steps: [take(0), tokens(10000), take(10000), take(10000), take(10000), take(10000)],
          expected: [true, 3, true, true, true, false],
          hint: 'After a long quiet period the bucket is full, not overflowing.'
        },
        {
          name: 'A take with a cost',
          options: { capacity: 5, refillPerSecond: 1 },
          steps: [take(0, 3), take(0, 3), tokens(0), take(1000, 3), tokens(1000)],
          expected: [true, false, 2, true, 0],
          hint: 'take(key, cost) needs `cost` tokens. A refused take must not remove any.'
        },
        {
          name: 'A cost larger than capacity is always refused',
          options: { capacity: 2, refillPerSecond: 1 },
          steps: [take(0, 5), tokens(0), take(60000, 5)],
          expected: [false, 2, false],
          hint: 'If cost is more than the bucket can ever hold, the answer is always no and nothing is removed.'
        },
        {
          name: 'Each key has its own bucket',
          options: { capacity: 2, refillPerSecond: 2 },
          steps: [take(0, undefined, 'a'), take(0, undefined, 'a'), tokens(100, 'b'), tokens(100, 'a'), tokens(5000, 'c')],
          expected: [true, true, 2, 0.2, 2],
          hint: 'A key you have not seen yet starts full, whenever it first shows up.'
        }
      ]
    })
  }
}
