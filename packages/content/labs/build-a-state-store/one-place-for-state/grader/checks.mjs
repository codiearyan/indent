import { runCases } from '../../checks-helpers.mjs'

const sorted = (value) =>
  Array.isArray(value)
    ? value.map(sorted)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])]))
      : value
const same = (a, b) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b))
const json = (value) => (value === undefined ? 'undefined' : JSON.stringify(value))
const showState = (v) => `getState(): ${json(v.state)}`
const showTries = (tries) =>
  tries.map((r) => (r.threw ? `threw ${r.error}` : 'did not throw')).join('; ')

// Why a joined state is not the one expected, from what it lacks or has too much of.
function joinHint(state, want, otherwise) {
  if (state === undefined || state === null) return 'getState() gave nothing back. It returns the state the store holds now.'
  const lost = Object.keys(want).filter((key) => !(key in state))
  if (lost.length) {
    return `The state lost ${lost.join(', ')}, which the part did not mention. setState joins a part into the state: keys the part leaves out keep their values.`
  }
  return otherwise
}

export const checks = {
  create(t) {
    return runCases(t, 'createStore() or nextState()', [
      {
        name: 'getState() gives the first state',
        run: 'createCase',
        args: ['first'],
        pass: (v) => same(v.state, { ink: 'black', sheets: [{ size: 'A5', count: 300 }] }),
        show: showState,
        setup: "createStore({ ink: 'black', sheets: [{ size: 'A5', count: 300 }] }), then getState()",
        hint: 'A new store holds the state it was given until something changes it. getState() returns it.'
      },
      {
        name: 'A part is joined in',
        run: 'createCase',
        args: ['join'],
        pass: (v) => same(v.state, { ink: 'black', stock: 'kraft', lines: ['menu'] }),
        show: showState,
        setup: "createStore({ ink: 'black', stock: 'linen', lines: ['menu'] }), then setState({ stock: 'kraft' })",
        hint: (v) =>
          joinHint(v?.state, { ink: 1, stock: 1, lines: 1 }, 'The key in the part should take its new value, and the others keep theirs.')
      },
      {
        name: 'Several parts, one after another',
        run: 'createCase',
        args: ['many'],
        pass: (v) => same(v.state, { ink: 'blue', stock: 'linen', rush: true, proof: 'sent' }),
        show: showState,
        setup: "createStore({ ink: 'black', stock: 'linen', rush: false }), setState({ rush: true, proof: 'sent' }), then setState({ ink: 'blue' })",
        hint: (v) =>
          joinHint(
            v?.state,
            { ink: 1, stock: 1, rush: 1, proof: 1 },
            'Each part joins into the state as it is now, so the second change starts from what the first one left, and a key the state did not have yet is added.'
          )
      },
      {
        name: 'A part replaces a value whole',
        run: 'createCase',
        args: ['whole'],
        pass: (v) => same(v.state, { stock: { kind: 'kraft' }, ink: 'black' }),
        show: showState,
        setup: "createStore({ stock: { kind: 'linen', weight: 300 }, ink: 'black' }), then setState({ stock: { kind: 'kraft' } })",
        hint: (v) =>
          v?.state?.stock?.weight !== undefined
            ? "stock kept its old weight. Joining works on the top keys only: the part's stock replaces the old stock whole, it is not joined into it."
            : joinHint(v?.state, { stock: 1, ink: 1 }, "The part's stock should replace the old one whole, and ink keeps its value.")
      },
      {
        name: 'Two stores keep their own state',
        run: 'createCase',
        args: ['two'],
        pass: (v) => v.a?.jobs === 2 && v.b?.jobs === 5,
        show: (v) => `store A: ${json(v.a)}\nstore B: ${json(v.b)}`,
        setup: 'store A starts with { jobs: 1 }, store B with { jobs: 5 }, then A.setState({ jobs: 2 })',
        hint: (v) =>
          v?.b?.jobs === 2 || v?.a?.jobs === 5
            ? 'One store changed the other. Keep each state inside the store createStore() returns, in a variable of that call, not in one variable for the whole file.'
            : 'Store A should hold { jobs: 2 } and store B its own { jobs: 5 }.'
      },
      {
        name: 'nextState() joins a part',
        run: 'createCase',
        args: ['next'],
        pass: (v) => same(v.result, { ink: 'black', stock: 'kraft', rush: false, proof: 'sent' }),
        show: (v) => `returned ${json(v.result)}`,
        setup: "nextState({ ink: 'black', stock: 'linen', rush: false }, { stock: 'kraft', proof: 'sent' })",
        hint: (v) =>
          v?.result === undefined || v?.result === null
            ? 'nextState() returned nothing. It returns the joined state.'
            : joinHint(v.result, { ink: 1, stock: 1, rush: 1, proof: 1 }, "The part's keys take their new values, a new key is added, and every other key keeps its value.")
      }
    ])
  },

  updater(t) {
    return runCases(t, 'createStore() or setState()', [
      {
        name: 'A function gets the state now',
        run: 'updaterCase',
        args: ['fn'],
        pass: (v) => same(v.seen, [{ jobs: 4, ink: 'black' }]) && same(v.state, { jobs: 5, ink: 'black' }),
        show: (v) => `the function was called with ${v.seen.length ? v.seen.map(json).join(', then ') : 'nothing, it was never called'}\n${showState(v)}`,
        setup: "a store with { jobs: 4, ink: 'black' }, then setState((state) => ({ jobs: state.jobs + 1 }))",
        hint: (v) =>
          !v?.seen?.length
            ? 'setState was given a function, and never called it. When the change is a function, call it with the state now and join in the part it returns.'
            : v.seen.length > 1
              ? 'The function was called more than once. Call it once per setState.'
              : !same(v.seen[0], { jobs: 4, ink: 'black' })
                ? 'The function should be called with the state as it is now.'
                : joinHint(v.state, { jobs: 1, ink: 1 }, 'Join the part the function returns into the state, as you do with a part given directly.')
      },
      {
        name: 'Each function sees the change before it',
        run: 'updaterCase',
        args: ['twice'],
        pass: (v) => same(v.state, { jobs: 6, ink: 'red' }),
        show: showState,
        setup: "a store with { jobs: 4, ink: 'black' }, then a +1 function, setState({ ink: 'red' }) and another +1 function",
        hint: (v) =>
          v?.state?.jobs === 4
            ? 'jobs did not go up at all. setState was given a function: call it with the state now and join in the part it returns.'
            : v?.state?.jobs === 5
            ? 'jobs went up once, not twice. Each function should get the state as it is at that moment, after every change before it, not the state the store started with.'
            : joinHint(v?.state, { jobs: 1, ink: 1 }, 'Each change starts from the state the change before it left.')
      },
      {
        name: "A function's part is joined in",
        run: 'updaterCase',
        args: ['part'],
        pass: (v) => same(v.state, { jobs: 4, ink: 'green' }),
        show: showState,
        setup: "a store with { jobs: 4, ink: 'black' }, then setState(() => ({ ink: 'green' }))",
        hint: (v) =>
          v?.state?.ink === 'black'
            ? "ink did not change. setState was given a function: call it and join in the part it returns."
            : joinHint(v?.state, { jobs: 1, ink: 1 }, 'The function returns a part; join it in like any part, so jobs keeps its value.')
      },
      {
        name: 'A part that is not an object is refused',
        run: 'updaterCase',
        args: ['bad'],
        pass: (v) => v.tries.every((r) => r.threw && r.typeError) && same(v.state, { jobs: 4, ink: 'black' }),
        show: (v) => `${showTries(v.tries)}\n${showState(v)}`,
        setup: "a store with { jobs: 4, ink: 'black' }, then setState(null), setState(7) and setState('kraft')",
        hint: (v) =>
          v?.tries?.every((r) => r.threw && r.typeError)
            ? 'Each was refused, but the state changed anyway. Refuse before changing anything.'
            : 'A part has to be an object. Spreading null or a number into an object adds nothing and says nothing, so the mistake would go unseen: throw a TypeError instead.'
      },
      {
        name: 'A function that returns no object is refused',
        run: 'updaterCase',
        args: ['badFn'],
        pass: (v) => v.tries.every((r) => r.threw && r.typeError) && same(v.state, { jobs: 4, ink: 'black' }),
        show: (v) => `${showTries(v.tries)}\n${showState(v)}`,
        setup: "a store with { jobs: 4, ink: 'black' }, then setState(() => undefined) and setState(() => 'kraft')",
        hint: 'What the function returns is the part, so the same rule holds: throw a TypeError when it is not an object, and leave the state as it was.'
      },
      {
        name: 'The first state is an object',
        run: 'updaterCase',
        args: ['first'],
        pass: (v) => v.first.threw && v.first.typeError && v.number.threw && v.number.typeError,
        show: (v) => `createStore(null) ${v.first.threw ? `threw ${v.first.error}` : 'did not throw'}\ncreateStore(42) ${v.number.threw ? `threw ${v.number.error}` : 'did not throw'}`,
        setup: 'createStore(null), then createStore(42)',
        hint: 'A state is an object that parts are joined into. Throw a TypeError from createStore when the first state is not one; null counts as not an object, even though typeof says object.'
      }
    ])
  },

  fresh(t) {
    return runCases(t, 'createStore() or nextState()', [
      {
        name: 'A change makes a new state object',
        run: 'freshCase',
        args: ['new'],
        pass: (v) => v.newObject,
        show: (v) => `${showState(v)}\n${v.newObject ? 'a new object' : 'the same object as before the change'}`,
        setup: "a store with { ink: 'black', stock: 'linen', jobs: 1 }, keep getState(), then setState({ stock: 'kraft' })",
        hint: 'After the change, getState() gave back the very object it gave before. Make a new object for every change, and leave the old one as it was.'
      },
      {
        name: 'Between changes, getState() gives the same object',
        run: 'freshCase',
        args: ['same'],
        pass: (v) => v.again && v.afterAgain,
        show: (v) => `two reads before the change: ${v.again ? 'the same object' : 'two different objects'}\ntwo reads after it: ${v.afterAgain ? 'the same object' : 'two different objects'}`,
        setup: "a store with { ink: 'black', stock: 'linen', jobs: 1 }, getState() twice, then setState({ stock: 'kraft' }) and getState() twice",
        hint: 'getState() handed out a new object each time, though nothing had changed. Return the state the store holds, the very object: a new object is how the next issues tell that something changed.'
      },
      {
        name: 'A state read before keeps its values',
        run: 'freshCase',
        args: ['before'],
        pass: (v) => v.unchanged,
        show: (v) => `the state read before is now ${json(v.before)}`,
        setup: "a store with { ink: 'black', stock: 'linen', jobs: 1 }, keep getState(), then setState({ stock: 'kraft', proof: 'sent' }) and a +1 function on jobs",
        hint: 'Code that read the state before the change saw it change under its feet. Copy the keys into a new object, never write them into the old one: Object.assign(state, part) and state[key] = value both change it in place.'
      },
      {
        name: 'The first state is never changed',
        run: 'freshCase',
        args: ['initial'],
        pass: (v) => v.unchanged,
        show: (v) => `the object given to createStore() is now ${json(v.initial)}`,
        setup: "const first = { ink: 'black', stock: 'linen', jobs: 1 }, createStore(first), then two changes",
        hint: 'The object given to createStore() changed. It belongs to whoever made it: the store may hold it, but a change makes a new state instead of writing into it.'
      },
      {
        name: 'nextState() changes neither argument',
        run: 'freshCase',
        args: ['next'],
        pass: (v) =>
          v.threw === undefined &&
          v.newObject &&
          same(v.state, { ink: 'black', stock: 'linen' }) &&
          same(v.part, { stock: 'kraft' }) &&
          same(v.result, { ink: 'black', stock: 'kraft' }),
        show: (v) =>
          v.threw
            ? `nextState threw ${v.threw}`
            : `returned ${json(v.result)}${v.newObject ? ', a new object' : ', one of the objects it was given'}\nstate is now ${json(v.state)}\npart is now ${json(v.part)}`,
        setup: "const state = { ink: 'black', stock: 'linen' }, const part = { stock: 'kraft' }, then nextState(state, part)",
        hint: (v) =>
          !same(v?.state, { ink: 'black', stock: 'linen' }) || !same(v?.part, { stock: 'kraft' })
            ? 'nextState() changed an object it was given. Build the result in a new object.'
            : !v?.newObject
              ? 'nextState() returned one of the objects it was given. Return a new object, even when the values are the same.'
              : 'nextState() should return a new object with the part joined in.'
      }
    ])
  }
}
