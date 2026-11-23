import { runCases } from '../../checks-helpers.mjs'

const json = (value) => (value === undefined ? 'undefined' : JSON.stringify(value))
const showCalls = (v) =>
  v.calls.length
    ? `listener told ${v.calls.length} time(s): ${(v.seen ?? v.calls.map(([part, previous]) => `(${json(part)}, ${json(previous)})`)).join(', ')}`
    : 'listener never told'
const callsAre = (...want) => (v) => json(v.calls) === json(want)

// When the listener was told about a change that did not touch its part.
function quietHint(v, otherwise) {
  // The check's values travel as JSON, so an undefined part arrives as null.
  if (v?.calls?.length && v.calls[0][1] === null && v.calls[0][0] !== null) {
    return 'The listener was told with undefined as the part before. watch() should read the part once, when it is called, and compare every new part with the one it saw last.'
  }
  return otherwise
}

export const checks = {
  watch(t) {
    return runCases(t, 'watch()', [
      {
        name: 'Told when its part changes',
        run: 'watchCase',
        args: ['number'],
        pass: callsAre([3, 2]),
        show: showCalls,
        setup: 'a store with { jobs: 2, ... }, watch(store, (state) => state.jobs, listener), then setState({ jobs: 3 })',
        hint: (v) =>
          v?.calls.length && v.calls[0][1] === null
            ? quietHint(v, '')
            : !v?.calls.length
            ? 'The part changed from 2 to 3, so the listener should be told. watch() is built on subscribe(): each time the store tells it, pick the part out of the new state and compare.'
            : 'Tell the listener once, with the new part first and the part before second.'
      },
      {
        name: 'Not told when another part changes',
        run: 'watchCase',
        args: ['other'],
        pass: callsAre(),
        show: showCalls,
        setup: "watch(store, (state) => state.jobs, listener), then setState({ ink: 'blue' }) and setState({ stock: 'kraft' })",
        hint: (v) =>
          quietHint(
            v,
            'jobs did not change, so the listener should hear nothing. Compare the part the selector picks now with the one it picked last time, and only tell the listener when they differ.'
          )
      },
      {
        name: 'Each call has the part before',
        run: 'watchCase',
        args: ['previous'],
        pass: callsAre([3, 2], [5, 3]),
        show: showCalls,
        setup: "watch(store, (state) => state.jobs, listener), then jobs to 3, setState({ ink: 'blue' }), then jobs to 5",
        hint: (v) =>
          quietHint(
            v,
            'The listener should be told twice, each time with the new part and the one it was told before. Remember the part each time it changes.'
          )
      },
      {
        name: 'A number worked out each time',
        run: 'watchCase',
        args: ['count'],
        pass: callsAre([3, 2]),
        show: showCalls,
        setup: "a store with { lines: ['menu', 'tag'], ... }, watch(store, (state) => state.lines.length, listener), then a new array of the same lines, then one line more",
        hint: (v) =>
          quietHint(
            v,
            'A new array of the same two lines still has 2 lines, so the count did not change: only the second change should reach the listener. Compare the parts the selector gives, not the states.'
          )
      },
      {
        name: 'A text worked out each time',
        run: 'watchCase',
        args: ['text'],
        pass: callsAre(['menu, tag, card', 'menu, tag']),
        show: showCalls,
        setup: "watch(store, (state) => state.lines.join(', '), listener), then a new array of the same lines, then one line more",
        hint: (v) =>
          quietHint(
            v,
            'The selector builds a new piece of text each time, but two texts with the same letters are the same value, so the first change says nothing to this listener.'
          )
      },
      {
        name: 'A new array is a change',
        run: 'watchCase',
        args: ['array'],
        pass: (v) => v.calls === 1 && v.newArray,
        show: (v) => `listener told ${v.calls} time(s)${v.calls ? (v.newArray ? ', with the new array' : ', not with the new array') : ''}`,
        setup: "watch(store, (state) => state.lines, listener), then setState((state) => ({ lines: [...state.lines] }))",
        hint: (v) =>
          v?.calls
            ? 'Tell the listener with the part as the selector gave it, the new array itself.'
            : 'The array holds the same words, but it is a new array, so with Object.is it is a change. watch() compares parts by identity unless it is given an isEqual: looking inside is the job of isEqual, in the next task.'
      },
      {
        name: 'NaN stays NaN',
        run: 'watchCase',
        args: ['nan'],
        pass: callsAre(),
        show: showCalls,
        setup: "a store with { total: NaN, ... }, watch(store, (state) => state.total, listener), then setState({ ink: 'blue' })",
        hint: (v) =>
          v && !v.compares
            ? quietHint(v, 'Neither total nor jobs changed, yet the listeners were told. Compare the part the selector picks now with the one it picked last time.')
            : 'NaN !== NaN is true, so !== says the total changed when it did not. Compare with Object.is.'
      },
      {
        name: 'The stop function stops it',
        run: 'watchCase',
        args: ['stop'],
        pass: (v) => v.returned === 'function' && v.calls.length === 0,
        show: (v) => (v.returned === 'function' ? showCalls(v) : `watch() returned ${v.returned}, not a function`),
        setup: 'const stop = watch(store, (state) => state.jobs, listener), stop(), then setState({ jobs: 3 })',
        hint: (v) =>
          v?.returned !== 'function'
            ? 'watch() should return a function that stops it. subscribe() already gives you one.'
            : 'The listener was told after it was stopped. Return the stop function of the subscription watch() made.'
      }
    ])
  },

  equal(t) {
    return runCases(t, 'watch()', [
      {
        name: 'isEqual decides what is a change',
        run: 'equalCase',
        args: ['decides'],
        pass: (v) => v.calls.length === 1 && v.calls[0][0]?.jobs === 4,
        show: showCalls,
        setup: "watch(store, (state) => ({ jobs: state.jobs, ink: state.ink }), listener, sameJobsAndInk), then setState({ stock: 'kraft' }), then setState({ jobs: 4 })",
        hint: (v) =>
          v?.calls.length === 2
            ? 'The selector makes a new object every time, so Object.is calls every round a change. When isEqual is given, ask it instead: it says jobs and ink did not change when stock did.'
            : 'The listener should be told once, for the change of jobs, with the new part.'
      },
      {
        name: 'Without isEqual, a new object is a change',
        run: 'equalCase',
        args: ['default'],
        pass: (v) => v.calls === 1,
        show: (v) => `listener told ${v.calls} time(s)`,
        setup: "watch(store, (state) => ({ jobs: state.jobs, ink: state.ink }), listener) with no isEqual, then setState({ stock: 'kraft' })",
        hint: 'With no isEqual, parts are compared with Object.is, and a new object is never the same object as the last one. Use isEqual only when it is given.'
      },
      {
        name: 'isEqual gets the part before, then the new part',
        run: 'equalCase',
        args: ['args'],
        pass: (v) => v.seen.length === 1 && v.seen[0][0]?.jobs === 2 && v.seen[0][1]?.jobs === 5 && v.calls === 1 && v.newFirst && v.oldSecond,
        show: (v) =>
          `isEqual called with ${v.seen.map(([a, b]) => `(${json(a)}, ${json(b)})`).join(', ') || 'nothing, it was never called'}\nlistener told ${v.calls} time(s)`,
        setup: 'a store with { jobs: 2, ink: \'black\', ... }, watch(store, selector, listener, isEqual), then setState({ jobs: 5 })',
        hint: (v) =>
          !v?.seen.length
            ? 'isEqual was never called. When it is given, call it to compare the part before with the new one.'
            : v.seen.length > 1
              ? 'isEqual was called more than once for one change. Call it once per round.'
              : v.seen[0][0]?.jobs !== 2
                ? 'Call isEqual with the part before first and the new part second.'
                : 'isEqual said the parts differ, so tell the listener with the new part and the part before.'
      },
      {
        name: 'isEqual alone decides',
        run: 'equalCase',
        args: ['alone'],
        pass: callsAre([2, 2]),
        show: showCalls,
        setup: "watch(store, (state) => state.jobs, listener, () => false), then setState({ ink: 'blue' })",
        hint: 'This isEqual says no two parts are ever the same, so the listener hears about every round, even though jobs stayed 2. When isEqual is given, it decides alone: do not also compare with Object.is.'
      }
    ])
  },

  shallow(t) {
    const pairs = {
      same: ['the same object twice', true],
      copy: ['{ count: 2, total: 1300 } and a new { count: 2, total: 1300 }', true],
      value: ['{ count: 2, total: 1300 } and { count: 2, total: 1450 }', false],
      extraB: ['{ count: 2 } and { count: 2, total: 1300 }', false],
      extraA: ['{ count: 2, total: 1300 } and { count: 2 }', false],
      nested: ["{ lines: ['menu'] } and { lines: ['menu'] }, each with its own array", false],
      order: ["{ count: 2, ink: 'black' } and { ink: 'black', count: 2 }", true],
      nan: ['{ total: NaN } and { total: NaN }', true],
      missing: ['{ count: 2, note: undefined } and { count: 2, rush: undefined }', false],
      numbers: ['1300 and 1300', true],
      texts: ["'kraft' and 'kraft'", true],
      kinds: ["2 and '2'", false],
      nullObject: ['null and {}', false],
      arrays: ["['menu', 'tag'] and a new ['menu', 'tag']", true]
    }
    const kase = (name, kinds, hint) => ({
      name,
      run: 'shallowCase',
      args: [kinds],
      pass: (v) => v.every((r) => r.threw === undefined && r.result === pairs[r.kind][1]),
      show: (v) => v.map((r) => `shallowEqual(${pairs[r.kind][0]}) ${r.threw ? `threw ${r.threw}` : `returned ${json(r.result)}`}`).join('\n'),
      setup: `shallowEqual() with ${kinds.length} pair(s) of the check's own`,
      hint: (v) => {
        const threw = v?.find((r) => r.threw)
        if (threw) return `shallowEqual(${pairs[threw.kind][0]}) threw. Make sure both values are objects, and not null, before you read their keys.`
        return typeof hint === 'function' ? hint(v) : hint
      }
    })
    return runCases(t, 'shallowEqual()', [
      kase('The same object, or the same values', ['same', 'copy'], 'Two objects with the same keys and the very same values are equal for this purpose, even when they are two objects. Compare them key by key.'),
      kase('A different value, or a key more on either side', ['value', 'extraB', 'extraA'], 'Objects are equal only when they have the same keys, so count the keys of both, and every value is the same. Looking only at the keys of the first one misses a key the second one has more.'),
      kase('Values are compared by identity', ['nested'], "Each object has its own lines array, so the values are not the very same value, and shallowEqual says they differ. It looks one level down, never further: JSON.stringify or a deep comparison look inside the arrays too."),
      kase('Key order does not matter', ['order'], 'The same keys written in another order are still the same keys. Comparing JSON.stringify of both depends on the order: compare key by key instead.'),
      kase('NaN, and a key that is missing', ['nan', 'missing'], (v) =>
        v?.find((r) => r.kind === 'nan')?.result === false
          ? 'NaN !== NaN, so === calls the totals different. Compare each value with Object.is.'
          : "note is a key of the first object only, and rush of the second. Reading b.note gives undefined either way, so ask whether b has the key at all, with Object.hasOwn."
      ),
      kase('Plain values', ['numbers', 'texts', 'kinds', 'nullObject'], 'Two values that are not both objects are equal only when Object.is says so. null is not an object here, even though typeof null is object.'),
      kase('Arrays', ['arrays'], 'Two arrays with the same items in the same places are equal for this purpose: an array is an object whose keys are 0, 1, 2 and so on.'),
      {
        name: 'watch() with shallowEqual',
        run: 'shallowWatchCase',
        pass: (v) => json(v.calls) === json([{ count: 2, ink: 'blue' }]),
        show: (v) => `listener told ${v.calls.length} time(s)${v.calls.length ? `: ${v.calls.map(json).join(', ')}` : ''}`,
        setup: "watch(store, (state) => ({ count: state.lines.length, ink: state.ink }), listener, shallowEqual), then stock changes, a new array of the same lines, and ink to blue",
        hint: 'Only the change of ink changes this part: stock is not in it, and the same lines give the same count. If shallowEqual passes the cases above, look at how watch() uses isEqual.'
      }
    ])
  }
}
