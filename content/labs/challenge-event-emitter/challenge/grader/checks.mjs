import { isDeepStrictEqual } from 'node:util'

const FILE = 'src/emitter.ts'
const MANY = 30000
const LIMIT_MS = 1500

async function runCases(t, cases, extra = []) {
  const dir = await t.sandbox({ '.grader/drive.mjs': t.chapterPath('grader/drive.mjs') })
  const [runs, types, ...extras] = await Promise.all([
    Promise.all(cases.map((c) => t.call(dir, '.grader/drive.mjs', c.run, c.args ?? []))),
    t.typecheck(dir, [FILE]),
    ...extra.map((run) => run(t, dir))
  ])
  const unwritten = runs.find((r) => !r.ok && /Not implemented/.test(r.error))
  if (unwritten) {
    return [
      {
        name: 'Emitter is implemented',
        passed: false,
        message: `A method this task needs still throws 'Not implemented'. Replace those lines in ${FILE} with your code.`,
        output: unwritten.error
      }
    ]
  }
  return [
    ...cases.map((c, i) => {
      const r = runs[i]
      const passed = r.ok && isDeepStrictEqual(r.value, c.expected)
      return {
        name: c.name,
        passed,
        message: passed ? undefined : r.ok ? c.hint : `Your code threw an error in this scenario. ${c.hint}`,
        output: `${c.setup}\n${r.ok ? `got ${JSON.stringify(r.value)}` : r.error}`
      }
    }),
    ...extras,
    {
      name: `${FILE} type-checks`,
      passed: types.passed,
      message: types.passed ? undefined : `TypeScript reports errors in ${FILE}. Remember that Node runs it directly: no enums, no parameter properties.`,
      output: types.output
    }
  ]
}

async function manyRemovals(t, dir) {
  const r = await t.call(dir, '.grader/drive.mjs', 'manyRemovals', [MANY], { timeoutMs: 10000 })
  const right = r.ok && r.value.calls === MANY * 2 && r.value.left === 0
  const fast = r.ok && r.value.ms <= LIMIT_MS
  return {
    name: `Stays fast with ${MANY} listeners removed during an emit`,
    passed: right && fast,
    message: !r.ok
      ? 'The large run did not finish. Removing one listener probably copies or scans the whole list each time.'
      : !right
        ? 'The large run finished but called the wrong number of listeners or left some behind. Every listener should run exactly once.'
        : !fast
          ? `The large run took ${r.value.ms} ms. Removing one listener probably copies or scans the whole list each time.`
          : undefined,
    output: r.ok
      ? `${MANY} listeners that remove themselves, then ${MANY} once listeners: ${r.value.calls} calls, ${r.value.left} left, ${r.value.ms} ms (limit ${LIMIT_MS} ms)`
      : r.error
  }
}

export const checks = {
  basics(t) {
    return runCases(t, [
      {
        name: 'Calls listeners in order with the arguments',
        run: 'inOrder',
        setup: "on('save', a), on('save', b), emit('save', 1, 'two') (log lists each call with its arguments)",
        expected: { returned: true, log: ['a 1 two', 'b 1 two'] },
        hint: 'Every listener of the event should run, in the order it was added, with all the arguments given to emit. emit returns true when there were listeners.'
      },
      {
        name: 'emit returns false when nobody listens',
        run: 'noListeners',
        setup: "emit('save') on a new emitter, then on('save', a) and emit('load')",
        expected: { returned: [false, false], log: [] },
        hint: 'An event with no listeners is not an error. Events are separate: a listener for one name never hears another.'
      },
      {
        name: 'off removes a listener and reports it',
        run: 'offRemoves',
        setup: "on('save', a), on('save', b), off('save', a) twice, off('load', b), emit('save')",
        expected: { off: [true, false, false], log: ['b'], count: 1 },
        hint: 'off returns true only when it removed something. Removing from one event must not touch another.'
      },
      {
        name: 'on returns a function that removes the listener',
        run: 'unsubscribe',
        setup: "const stop = on('save', a), on('save', b), stop() twice, emit('save')",
        expected: { returned: true, log: ['b'], count: 1 },
        hint: 'The function on returns should remove exactly that registration. Calling it a second time should do nothing.'
      },
      {
        name: 'The same listener added twice runs twice',
        run: 'sameListenerTwice',
        setup: "on('save', a) twice, emit('save', 1), off('save', a), emit('save', 2), then listenerCount for 'save' and an unknown event",
        expected: { log: ['a 1', 'a 1', 'a 2'], count: 1, unknown: 0 },
        hint: 'Each call to on is its own registration. off removes one of them, the earliest. listenerCount of an unknown event is 0.'
      }
    ])
  },

  once(t) {
    return runCases(t, [
      {
        name: 'A once listener runs one time',
        run: 'onceFiresOnce',
        setup: "once('save', a), emit('save', 1), emit('save', 2)",
        expected: { returned: [true, false], log: ['a 1'], count: 0 },
        hint: 'After it runs, a once listener is gone: the next emit finds no listeners.'
      },
      {
        name: 'once keeps its place among other listeners',
        run: 'onceMixed',
        setup: "on('save', a), once('save', b), on('save', c), emit('save', 1), emit('save', 2)",
        expected: { log: ['a 1', 'b 1', 'c 1', 'a 2', 'c 2'] },
        hint: 'A once listener runs in the order it was added, like any other, and only on the first emit.'
      },
      {
        name: 'A once listener can be removed before it runs',
        run: 'onceRemovedEarly',
        setup: "once('save', a), off('save', a), stop = once('save', b), stop(), emit('save')",
        expected: { off: true, returned: false, log: [] },
        hint: 'off with the original function should find a once listener, and the function once returns should remove it too.'
      },
      {
        name: 'A once listener that emits the same event runs only once',
        run: 'onceReentrant',
        setup: "once('save', fn) where fn logs and calls emit('save') again, then emit('save', 1)",
        expected: { log: ['a 1'] },
        hint: 'If the listener is still registered while it runs, the nested emit calls it again. When should it be removed?'
      }
    ])
  },

  safe(t) {
    return runCases(
      t,
      [
        {
          name: 'A listener added during an emit waits for the next one',
          run: 'addedDuringEmit',
          setup: "on('save', a) where a adds a new listener, then emit('save') twice",
          expected: { first: ['a'], second: ['a', 'late'] },
          hint: 'An emit should work from the listeners that existed when it started. Something added halfway through runs from the next emit.'
        },
        {
          name: 'A listener removed during an emit does not run',
          run: 'removedDuringEmit',
          setup: "on('save', a), on('save', b), on('save', c) where a calls off('save', c), then emit('save')",
          expected: { log: ['a', 'b'], count: 2 },
          hint: 'Working from a copy of the list is half the answer. Before calling each listener, check it was not removed in the meantime.'
        },
        {
          name: 'A listener that removes itself does not skip the next one',
          run: 'removesItself',
          setup: "on('save', a), on('save', b), on('save', c) where a removes itself, then emit('save') twice",
          expected: { first: ['a', 'b', 'c'], second: ['b', 'c'] },
          hint: 'Removing an item from the array you are looping over shifts the next item into the current index. Loop over something that does not change.'
        },
        {
          name: 'A throwing listener does not stop the others',
          run: 'errorsWithHandler',
          setup: "new Emitter({ onError }), on('save', a) where a throws, on('save', b), emit('save')",
          expected: { returned: true, log: ['a', 'b'], errors: [['disk full', 'save']] },
          hint: 'Catch around each listener call. With onError, pass it the error and the event name, then carry on.'
        },
        {
          name: 'Without onError, emit throws the first error at the end',
          run: 'errorsWithoutHandler',
          setup: "on('save', a), on('save', b), on('save', c) where a and b throw, then emit('save') inside try/catch",
          expected: { log: ['a', 'b', 'c'], thrown: 'first' },
          hint: 'Every listener should still run. Keep the errors and throw the first one only after the loop.'
        },
        {
          name: 'A once listener that throws is still removed',
          run: 'onceThatThrows',
          setup: "new Emitter({ onError }), once('save', fn) where fn throws, emit('save') twice",
          expected: { runs: 1, count: 0 },
          hint: 'If removal happens after the call, an error skips it. Remove the once listener before calling it.'
        }
      ],
      [manyRemovals]
    )
  }
}
