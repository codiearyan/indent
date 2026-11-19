import { isDeepStrictEqual } from 'node:util'

const WAIT = 100
const STREAM = 100000
const LIMIT_MS = 2000
const WINDOWS = STREAM / WAIT + 1

const call = (at, ...args) => [at, 'call', ...args]

async function runScenarios(t, { file, name, scenarios, extra = [] }) {
  const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
  const [runs, real, types, ...extras] = await Promise.all([
    Promise.all(scenarios.map((s) => t.call(dir, '.grader/drive.mjs', 'replay', [file, name, WAIT, s.options ?? {}, s.steps]))),
    t.call(dir, '.grader/drive.mjs', 'realClock', [file, name]),
    t.typecheck(dir, [file]),
    ...extra.map((run) => run(t, dir))
  ])
  const unwritten = runs.find((r) => !r.ok && /Not implemented/.test(r.error))
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
  const silent = runs.every((r) => r.ok && r.value.length === 0)
  const realExpected = name === 'throttle' ? ['a', 'c'] : ['c']
  return [
    ...scenarios.map((s, i) => {
      const r = runs[i]
      const passed = r.ok && isDeepStrictEqual(r.value, s.expected)
      const steps = s.steps.map(([at, action, ...args]) => `t=${at} ${action}(${args.map((a) => JSON.stringify(a)).join(', ')})`).join(', ')
      return {
        name: s.name,
        passed,
        message: passed
          ? undefined
          : !r.ok
            ? `Your code threw an error in this scenario. ${s.hint}`
            : silent
              ? 'fn never ran while the check moved its fake clock. Start and clear timers only through options.timers, never with the global setTimeout.'
              : s.hint,
        output: `${name}(fn, ${WAIT}${s.options ? `, ${JSON.stringify(s.options)}` : ''}): ${steps || 'no calls'}\n` +
          `fn ran at [time, ...args]: ${r.ok ? JSON.stringify(r.value) : r.error}\nexpected ${JSON.stringify(s.expected)}`
      }
    }),
    {
      name: 'Uses real timers when none are given',
      passed: real.ok && isDeepStrictEqual(real.value, realExpected),
      message: real.ok && isDeepStrictEqual(real.value, realExpected)
        ? undefined
        : 'Without a timers option, fall back to realTimers from ./timers.ts so the function still works in a real program.',
      output: `${name}(fn, 30) called with 'a', 'b', 'c' at once, then 150 ms of real time\nfn ran with: ${real.ok ? JSON.stringify(real.value) : real.error}`
    },
    ...extras,
    {
      name: `${file} type-checks`,
      passed: types.passed,
      message: types.passed ? undefined : `TypeScript reports errors in ${file}. Remember that Node runs it directly: no enums, no parameter properties.`,
      output: types.output
    }
  ]
}

async function streamCheck(t, dir) {
  const r = await t.call(dir, '.grader/drive.mjs', 'stream', ['src/throttle.ts', STREAM, 1, WAIT], { timeoutMs: 10000 })
  const right = r.ok && r.value.calls === WINDOWS && r.value.last === STREAM - 1
  const lean = r.ok && r.value.timers <= WINDOWS * 2 && r.value.ms <= LIMIT_MS
  return {
    name: `One timer per window over ${STREAM} calls`,
    passed: right && lean,
    message: !r.ok
      ? 'The long stream did not finish. Look for a timer started on every call.'
      : !right
        ? 'Over a long steady stream of calls, fn should run once per window and the very last call must not be lost.'
        : !lean
          ? 'fn ran at the right times, but too many timers were started. Calls during an open window only need to remember their arguments.'
          : undefined,
    output: r.ok
      ? `${STREAM} calls, one per ms, wait ${WAIT}: fn ran ${r.value.calls} times (expected ${WINDOWS}), last with ${r.value.last}, ` +
        `${r.value.timers} timers started (limit ${WINDOWS * 2}), ${r.value.ms} ms (limit ${LIMIT_MS} ms)`
      : r.error
  }
}

export const checks = {
  debounce(t) {
    return runScenarios(t, {
      file: 'src/debounce.ts',
      name: 'debounce',
      scenarios: [
        {
          name: 'Runs once after a burst, with the latest arguments',
          steps: [call(0, 'a'), call(30, 'b'), call(60, 'c')],
          expected: [[160, 'c']],
          hint: 'Each call should cancel the timer from the previous call and start a new one, keeping only the latest arguments.'
        },
        {
          name: 'Waits from the last call, not the first',
          steps: [call(0, 'a'), call(90, 'b'), call(180, 'c')],
          expected: [[280, 'c']],
          hint: 'The wait restarts on every call, so a slow steady stream keeps fn from running until it stops.'
        },
        {
          name: 'Separate bursts run separately',
          steps: [call(0, 'a'), call(250, 'b')],
          expected: [[100, 'a'], [350, 'b']],
          hint: 'Once a burst has ended and fn has run, the next call starts a fresh wait.'
        },
        {
          name: 'Passes every argument',
          steps: [call(0, 'x', 1, true)],
          expected: [[100, 'x', 1, true]],
          hint: 'fn should receive all the arguments of the call, not only the first.'
        },
        {
          name: 'Does nothing without a call',
          steps: [],
          expected: [],
          hint: 'Creating a debounced function must not schedule anything by itself.'
        }
      ]
    })
  },

  options(t) {
    return runScenarios(t, {
      file: 'src/debounce.ts',
      name: 'debounce',
      scenarios: [
        {
          name: 'leading runs the first call of each burst at once',
          options: { leading: true, trailing: false },
          steps: [call(0, 'a'), call(30, 'b'), call(60, 'c'), call(300, 'd')],
          expected: [[0, 'a'], [300, 'd']],
          hint: 'With leading, the first call of a burst runs immediately. Later calls in the same burst only extend it.'
        },
        {
          name: 'leading and trailing together',
          options: { leading: true },
          steps: [call(0, 'a'), call(30, 'b'), call(60, 'c')],
          expected: [[0, 'a'], [160, 'c']],
          hint: 'With both, the burst runs fn at its start and again at its end with the latest arguments.'
        },
        {
          name: 'A single leading call does not run again at the end',
          options: { leading: true },
          steps: [call(0, 'a'), call(200, 'b')],
          expected: [[0, 'a'], [200, 'b']],
          hint: 'The trailing run happens only if a call came after the one that already ran at the start.'
        },
        {
          name: 'cancel drops the pending call',
          steps: [call(0, 'a'), call(50, 'b'), [80, 'cancel'], call(400, 'c')],
          expected: [[500, 'c']],
          hint: 'cancel should clear the timer and forget the arguments, and the debounced function must keep working afterwards.'
        },
        {
          name: 'cancel ends the burst',
          options: { leading: true },
          steps: [call(0, 'a'), [10, 'cancel'], call(20, 'b')],
          expected: [[0, 'a'], [20, 'b']],
          hint: 'After cancel, the next call starts a new burst, so with leading it runs at once.'
        },
        {
          name: 'flush runs the pending call now',
          steps: [call(0, 'a'), call(50, 'b'), [70, 'flush'], [300, 'flush']],
          expected: [[70, 'b']],
          hint: 'flush should run a pending call at once and clear the timer, so it does not run again later. With nothing pending, flush does nothing.'
        },
        {
          name: 'A call after flush starts a new burst',
          options: { leading: true },
          steps: [call(0, 'a'), [10, 'flush'], call(20, 'b'), call(30, 'c')],
          expected: [[0, 'a'], [20, 'b'], [130, 'c']],
          hint: 'flush ends the burst. With leading, the next call runs at once, and the leading call itself is never run twice.'
        }
      ]
    })
  },

  throttle(t) {
    return runScenarios(t, {
      file: 'src/throttle.ts',
      name: 'throttle',
      extra: [streamCheck],
      scenarios: [
        {
          name: 'Runs at once, then once at the end of the window',
          steps: [call(0, 'a'), call(10, 'b'), call(20, 'c'), call(50, 'd')],
          expected: [[0, 'a'], [100, 'd']],
          hint: 'The first call runs immediately. Calls during the window are collapsed into one run with the latest arguments when it closes.'
        },
        {
          name: 'The last call is never lost',
          steps: [call(0, 'a'), call(99, 'b')],
          expected: [[0, 'a'], [100, 'b']],
          hint: 'A call that arrives during a window must run when the window closes, even if nothing else happens.'
        },
        {
          name: 'A steady stream runs once per window',
          steps: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300].map((at) => call(at, at)),
          expected: [[0, 0], [100, 90], [200, 180], [300, 270], [400, 300]],
          hint: 'When a window closes with a remembered call, run it and open a new window right away. Do not wait for the next call.'
        },
        {
          name: 'An idle window closes quietly',
          steps: [call(0, 'a'), call(150, 'b'), call(400, 'c')],
          expected: [[0, 'a'], [150, 'b'], [400, 'c']],
          hint: 'If nothing was remembered when a window closes, fn does not run, and the next call runs at once.'
        },
        {
          name: 'cancel drops the remembered call and closes the window',
          steps: [call(0, 'a'), call(50, 'b'), [60, 'cancel'], call(70, 'c')],
          expected: [[0, 'a'], [70, 'c']],
          hint: 'After cancel, nothing remembered may run, and the next call runs at once because no window is open.'
        }
      ]
    })
  }
}
