import { runCases } from '../../checks-helpers.mjs'

const list = (calls) => (calls.length ? calls.join(', ') : 'none')
const showCalls = (v) =>
  [
    v.before ? `callbacks run before it settled: ${list(v.before)}` : '',
    `callbacks run: ${list(v.calls)}`,
    v.thenThrew ? `then() threw ${v.thenThrew}` : '',
    v.threw?.length ? `threw ${v.threw[0]}` : '',
    v.escaped?.length ? `an error escaped: ${v.escaped[0]}` : ''
  ]
    .filter(Boolean)
    .join('\n')
const only = (...expected) => (v) =>
  !v.thenThrew && !v.threw?.length && !v.escaped.length && JSON.stringify(v.calls) === JSON.stringify(expected)

const ranEarly = (v) => v?.before?.length > 0
const wrongOne = (v, right) => v?.calls?.some((c) => !c.startsWith(right))
const differentValue = (v) => v?.calls?.some((c) => c.endsWith('with a different value'))

export const checks = {
  'waiting-callbacks'(t) {
    const hint = (right, other) => (v) =>
      v?.thenThrew
        ? 'then() threw. On a pending docket it should only keep the callbacks for later.'
        : ranEarly(v)
          ? 'A callback ran before the docket was settled. Keep the callbacks, and run them only when resolve or reject is called.'
          : wrongOne(v, right)
            ? `The wrong callback ran. This docket was ${other}, so only ${right} should run.`
            : differentValue(v)
              ? `${right} ran, but not with the very value the docket settled with.`
              : `When the docket settles, ${right} has to run once. Something has to remember the callbacks until then.`
    return runCases(t, 'then()', [
      {
        name: 'Runs onFulfilled once the docket is kept',
        run: 'waitingCase',
        args: ['fulfil'],
        pass: only('onFulfilled({ kraft: 300, laid: 85 })'),
        show: showCalls,
        setup: 'then(onFulfilled, onRejected) on a pending docket, then resolve({ kraft: 300, laid: 85 })',
        hint: hint('onFulfilled', 'kept')
      },
      {
        name: 'Runs onRejected once the docket fails',
        run: 'waitingCase',
        args: ['reject'],
        pass: only('onRejected(Error: No paper listed for napkin)'),
        show: showCalls,
        setup: "then(onFulfilled, onRejected) on a pending docket, then reject(new Error('No paper listed for napkin'))",
        hint: hint('onRejected', 'rejected')
      },
      {
        name: 'Runs the callback only once',
        run: 'waitingCase',
        args: ['fulfil', 3],
        pass: only('onFulfilled({ kraft: 300, laid: 85 })'),
        show: showCalls,
        setup: 'then(onFulfilled, onRejected) on a pending docket, then resolve called three times',
        hint: (v) =>
          v?.calls?.length > 1
            ? 'The callback ran more than once. Only the first resolve settles the docket, so only that one should run the callbacks.'
            : hint('onFulfilled', 'kept')(v)
      }
    ])
  },

  'already-settled'(t) {
    const hint = (right, state) => (v) =>
      v?.threw?.length
        ? `then() threw on a docket that was already ${state}.`
        : wrongOne(v, right)
          ? `The wrong callback ran. This docket was already ${state}, so only ${right} should run.`
          : differentValue(v)
            ? `${right} ran, but not with the docket's own value.`
            : `This docket was already ${state} when then() was called, so nothing is going to settle it again. then() has to look at the state and run ${right} itself.`
    return runCases(t, 'then()', [
      {
        name: 'Runs onFulfilled on a docket already kept',
        run: 'settledCase',
        args: ['fulfil', 'executor'],
        pass: only('onFulfilled 1({ kraft: 300, laid: 85 })'),
        show: showCalls,
        setup: 'a docket kept with { kraft: 300, laid: 85 } inside its executor, then then(onFulfilled, onRejected)',
        hint: hint('onFulfilled', 'kept')
      },
      {
        name: 'Runs onRejected on a docket already failed',
        run: 'settledCase',
        args: ['reject', 'executor'],
        pass: only('onRejected 1(Error: No paper listed for napkin)'),
        show: showCalls,
        setup: "a docket failed with Error('No paper listed for napkin') inside its executor, then then(onFulfilled, onRejected)",
        hint: hint('onRejected', 'rejected')
      },
      {
        name: 'Works on a docket that settled a moment ago',
        run: 'settledCase',
        args: ['fulfil', 'timer'],
        pass: only('onFulfilled 1({ kraft: 300, laid: 85 })'),
        show: showCalls,
        setup: 'a docket kept from a timer, and then() called after that timer has run',
        hint: hint('onFulfilled', 'kept')
      },
      {
        name: 'Each then() runs its own callback once',
        run: 'settledCase',
        args: ['reject', 'twice'],
        pass: only('onRejected 1(Error: No paper listed for napkin)', 'onRejected 2(Error: No paper listed for napkin)'),
        show: showCalls,
        setup: 'two then() calls on a docket that has already failed',
        hint: hint('onRejected', 'rejected')
      }
    ])
  },

  'many-callbacks'(t) {
    const order = (v) =>
      v?.threw?.length || v?.escaped?.length
        ? 'A missing callback is not an error, but your code threw. Only call a callback that is a function.'
        : v?.calls?.length < 3
          ? 'Not every callback ran. Every then() needs its own place, so a new callback must not replace one that is already waiting.'
          : v?.calls?.length > 3
            ? 'A callback ran more than once. Once a waiting callback has run, it should not run again.'
            : 'Every callback ran, but not in the order then() was called. The first one added runs first.'
    return runCases(t, 'then()', [
      {
        name: 'Three callbacks, in the order they were added',
        run: 'manyCase',
        args: [['before', 'before', 'before']],
        pass: only('callback 1({ kraft: 300, laid: 85 })', 'callback 2({ kraft: 300, laid: 85 })', 'callback 3({ kraft: 300, laid: 85 })'),
        show: showCalls,
        setup: 'three then() calls on a pending docket, then resolve({ kraft: 300, laid: 85 })',
        hint: order
      },
      {
        name: 'Some before it settles, one after',
        run: 'manyCase',
        args: [['before', 'before', 'after']],
        pass: only('callback 1({ kraft: 300, laid: 85 })', 'callback 2({ kraft: 300, laid: 85 })', 'callback 3({ kraft: 300, laid: 85 })'),
        show: showCalls,
        setup: 'two then() calls on a pending docket, resolve, then a third then()',
        hint: order
      },
      {
        name: 'A missing onRejected is skipped',
        run: 'missingCase',
        args: ['reject', 'fn', 'undefined'],
        pass: only(),
        show: showCalls,
        setup: 'then(onFulfilled) with no onRejected, on a docket that then fails, and again after it failed',
        hint: (v) =>
          v?.threw?.length || v?.escaped?.length
            ? 'With no onRejected there is nothing to run when the docket fails. Your code threw instead. Only call a callback that is a function.'
            : 'The docket failed, so onFulfilled must not run.'
      },
      {
        name: 'A missing onFulfilled is skipped',
        run: 'missingCase',
        args: ['fulfil', 'null', 'fn'],
        pass: only(),
        show: showCalls,
        setup: 'then(null, onRejected) on a docket that is then kept, and again after it was kept',
        hint: (v) =>
          v?.threw?.length || v?.escaped?.length
            ? 'null is not a callback. Your code threw when it tried to call it. Only call a callback that is a function.'
            : 'The docket was kept, so onRejected must not run.'
      },
      {
        name: 'A callback that is not a function is skipped',
        run: 'missingCase',
        args: ['reject', 'fn', 'text'],
        pass: only(),
        show: showCalls,
        setup: "then(onFulfilled, 'not a function') on a docket that then fails, and again after it failed",
        hint: (v) =>
          v?.threw?.length || v?.escaped?.length
            ? 'A string is not a callback. Your code threw. Check that a callback is a function before you call it, not only that it is there.'
            : 'The docket failed, so onFulfilled must not run.'
      }
    ])
  }
}
