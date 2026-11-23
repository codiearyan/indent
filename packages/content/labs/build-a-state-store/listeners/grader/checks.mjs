import { runCases } from '../../checks-helpers.mjs'

const json = (value) => (value === undefined ? 'undefined' : JSON.stringify(value))
const logIs = (...want) => (v) => json(v.log) === json(want)
const showLog = (v) => `listeners told, in order: ${v.log.filter((x) => x !== '|').join(', ') || 'none'}`
const told = (v) => `listener told ${v.log.length} time(s)`

// The rounds of a log, one line each: "change 1: header, basket".
function rounds(log) {
  const lines = []
  for (const item of log) {
    if (item.startsWith('| ')) lines.push({ head: item.slice(2), names: [] })
    else lines.at(-1)?.names.push(item)
  }
  return lines.map((line) => `${line.head} ${line.names.join(', ') || 'nobody told'}`).join('\n')
}

export const checks = {
  subscribe(t) {
    return runCases(t, 'subscribe()', [
      {
        name: 'A listener is told after a change',
        run: 'subscribeCase',
        args: ['told'],
        pass: (v) => v.count === 1 && v.newState && v.oldState,
        show: (v) =>
          v.count
            ? `told ${v.count} time(s), with ${v.newState ? 'the new state' : `${json(v.state)}, not the new state`} and ${v.oldState ? 'the state before' : 'something other than the state before'}`
            : 'the listener was never told',
        setup: "a store with { stock: 'linen', ... }, subscribe(listener), then setState({ stock: 'kraft' })",
        hint: (v) =>
          !v?.count
            ? 'subscribe() should keep the listener, and setState() should call every kept listener once the state has changed.'
            : v.count > 1
              ? 'One change should tell a listener once.'
              : !v.newState
                ? 'Call the listener with the new state first: the very object getState() returns after the change.'
                : 'Call the listener with the state before the change as its second argument, the very object it was.'
      },
      {
        name: 'The listener can read the new state',
        run: 'subscribeCase',
        args: ['told'],
        pass: (v) => v.count === 1 && v.readNew,
        show: (v) => (v.count ? `getState() inside the listener gave ${v.readNew ? 'the new state' : 'the old state'}` : 'the listener was never told'),
        setup: "a store, subscribe(listener) where the listener calls getState(), then setState({ stock: 'kraft' })",
        hint: (v) =>
          !v?.count
            ? 'subscribe() should keep the listener, and setState() should call it once the state has changed.'
            : v.count > 1
              ? 'One change should tell a listener once.'
              : 'Inside the listener, getState() still gave the old state. Change the state first, then tell the listeners.'
      },
      {
        name: 'Every listener, in the order they subscribed',
        run: 'subscribeCase',
        args: ['order'],
        pass: logIs('header', 'basket', 'total', '|', 'header', 'basket', 'total'),
        show: (v) => `after the part: ${v.log.slice(0, v.log.indexOf('|')).join(', ') || 'none'}\nafter the function: ${v.log.slice(v.log.indexOf('|') + 1).join(', ') || 'none'}`,
        setup: "subscribe(header), subscribe(basket), subscribe(total), then setState({ ink: 'blue' }) and setState((state) => ({ jobs: state.jobs + 1 }))",
        hint: (v) => {
          const fnRound = v ? v.log.slice(v.log.indexOf('|') + 1) : []
          if (v && v.log[0] === 'header' && !fnRound.length) {
            return 'The listeners heard about the part, but not about the change made with a function. Tell them after every change, whichever kind it was.'
          }
          return 'After each change, every listener is told once, in the order they subscribed.'
        }
      },
      {
        name: 'The stop function stops its listener',
        run: 'subscribeCase',
        args: ['stop'],
        pass: (v) => v.returned === 'function' && json(v.log) === json(['header']),
        show: (v) => (v.returned === 'function' ? showLog(v) : `subscribe() returned ${v.returned}, not a function`),
        setup: "subscribe(header), const stop = subscribe(total), stop(), then setState({ ink: 'blue' })",
        hint: (v) =>
          v?.returned !== 'function'
            ? 'subscribe() should return a function that stops this listener.'
            : v.log.includes('total')
              ? 'The stopped listener was still told. Calling the function subscribe() returned should take that listener out.'
              : v.log.length > 1
                ? 'One change should tell each listener once.'
                : 'Only the stopped listener should stop: header still listens.'
      },
      {
        name: 'A listener that is not a function is refused',
        run: 'subscribeCase',
        args: ['bad'],
        pass: (v) => v.bad.every((r) => r.threw && r.typeError),
        show: (v) => v.bad.map((r, i) => `${['subscribe(\'header\')', 'subscribe(undefined)'][i]} ${r.threw ? `threw ${r.error}` : 'did not throw'}`).join('\n'),
        setup: "subscribe('header'), then subscribe(undefined)",
        hint: 'A listener is called later, inside setState, far from the line that added it. Throw a TypeError right away when it is not a function, so the mistake shows where it was made.'
      }
    ])
  },

  unchanged(t) {
    return runCases(t, 'setState()', [
      {
        name: 'The same value tells nobody',
        run: 'unchangedCase',
        args: ['same'],
        pass: (v) => v.log.length === 0 && v.sameObject,
        show: (v) => `${told(v)}\n${v.sameObject ? 'getState() is the same object as before' : 'getState() is a new object'}`,
        setup: "a store with { stock: 'linen', ink: 'black', ... }, then setState({ stock: 'linen' }) and setState({ stock: 'linen', ink: 'black' })",
        hint: (v) =>
          v?.log.length
            ? 'Each key of these parts already had that very value, so nothing changed and nobody should be told.'
            : 'Nobody was told, which is right, but the state became a new object. When nothing changed, keep the state as it is.'
      },
      {
        name: 'One changed key is a change',
        run: 'unchangedCase',
        args: ['oneKey'],
        pass: (v) => v.log.length === 1 && v.state.ink === 'red',
        show: (v) => `${told(v)}\nink is ${json(v.state.ink)}`,
        setup: "a store with { stock: 'linen', ink: 'black', ... }, then setState({ stock: 'linen', ink: 'red' })",
        hint: 'stock is the same, but ink changed, so this is a change. Nothing changed only when every key of the part has the value the state already has.'
      },
      {
        name: 'A function that changes nothing tells nobody',
        run: 'unchangedCase',
        args: ['fn'],
        pass: (v) => v.log.length === 0 && v.sameObject,
        show: (v) => `${told(v)}\n${v.sameObject ? 'getState() is the same object as before' : 'getState() is a new object'}`,
        setup: 'a store with { jobs: 2, ... }, then setState((state) => ({ jobs: state.jobs })) and setState(() => ({}))',
        hint: (v) =>
          v?.log.length
            ? 'The part from the function holds the same values, and an empty part holds none, so nothing changed. Compare after the function has given you its part.'
            : 'Nobody was told, but the state became a new object. When nothing changed, keep the state as it is.'
      },
      {
        name: 'A new array is a change',
        run: 'unchangedCase',
        args: ['identity'],
        pass: (v) => v.log.length === 1 && v.newLines,
        show: (v) => `${told(v)}\n${v.newLines ? 'lines is the new array' : 'lines is still the old array'}`,
        setup: "a store with { lines: ['menu', 'tag'], ... }, then setState((state) => ({ lines: [...state.lines] }))",
        hint: 'The new lines hold the same words, but it is a new array, so it is a change. The store compares each value by identity, with Object.is, never by what is inside it: looking inside would be slow, and would miss the day someone does change it.'
      },
      {
        name: 'A key the state did not have is a change',
        run: 'unchangedCase',
        args: ['newKey'],
        pass: (v) => v.log.length === 1 && v.hasNote,
        show: (v) => `${told(v)}\n${v.hasNote ? 'the state has note' : 'the state has no note'}`,
        setup: "a store with { stock: 'linen', ink: 'black', ... } and no note, then setState({ note: undefined })",
        hint: 'The state had no note, so adding one is a change, even with the value undefined. Reading state.note gives undefined either way: ask whether the state has the key at all, with Object.hasOwn or in.'
      },
      {
        name: 'NaN is the same as NaN',
        run: 'unchangedCase',
        args: ['nan'],
        pass: (v) => v.log.length === 0,
        show: told,
        setup: "a store with { total: NaN, ink: 'black' }, then setState({ total: NaN })",
        hint: 'NaN === NaN is false, so === says every NaN is a change. Object.is(NaN, NaN) is true: compare with Object.is.'
      },
      {
        name: 'A listener that keeps a count in step comes to rest',
        run: 'unchangedCase',
        args: ['tidy'],
        pass: (v) => v.calls === 2 && v.count === 3,
        show: (v) => `the counting listener was told ${v.calls} time(s), count is ${json(v.count)}`,
        setup: "a store with { lines: ['menu', 'tag'], ... } and a listener that runs setState({ count: state.lines.length }) when told, then one more line",
        endless: 'Once count matches the lines, the listener sets count to the value it already has. That changes nothing, so nobody should be told, and the rounds end there.',
        hint: 'The listener should be told twice: once for the new line, once for its own change of count. Its next setState changes nothing, so it is not told again.'
      }
    ])
  },

  rounds(t) {
    const kase = (name, kind, want, setup, hint) => ({
      name,
      run: 'roundsCase',
      args: [kind],
      pass: logIs(...want),
      show: (v) => rounds(v.log),
      setup,
      hint
    })
    return runCases(t, 'subscribe()', [
      kase(
        'The same function can listen twice',
        'twice',
        ['| change 1:', 'header', 'header'],
        'subscribe(header) twice, then a change',
        'A function subscribed twice listens twice, like two parts of the screen that use the same drawing function. A Set keeps each function once: keep each subscription as its own entry.'
      ),
      kase(
        'Each stop function stops only its own',
        'stopTwice',
        ['| change 1:', 'header', 'header', '| change 2:', 'header', '| change 3:', 'header', '| change 4:'],
        'stopA = subscribe(header), stopB = subscribe(header); then a change, stopA(), a change, stopA() again, a change, stopB(), a change',
        'Stopping one subscription of a function that listens twice should leave the other, and calling the same stop function again should do nothing. Find the entry this subscribe() made, not the first entry with the same function.'
      ),
      kase(
        'A listener that stops itself',
        'self',
        ['| change 1:', 'paper', 'header', 'total', '| change 2:', 'header', 'total'],
        'subscribe(paper) where paper stops itself when told, then subscribe(header), subscribe(total), then two changes',
        'When a listener stops during a round, the listeners after it still have to be told. Removing an entry from the very array you are looping over moves the next one into its place, and the loop steps past it: loop over a copy, or build a new array when you remove.'
      ),
      kase(
        'A listener that stops one after it',
        'later',
        ['| change 1:', 'header', 'basket', 'total', '| change 2:', 'header', 'basket'],
        'subscribe(header) where header stops total, then subscribe(basket), subscribe(total), then two changes',
        'A round tells everyone who was listening when it began, so total still hears about change 1, and from change 2 it is gone. Loop over the listeners as they were when the round began.'
      ),
      kase(
        'A listener that stops one before it',
        'earlier',
        ['| change 1:', 'header', 'basket', 'total', '| change 2:', 'basket', 'total'],
        'subscribe(header), subscribe(basket) where basket stops header, subscribe(total), then two changes',
        'When basket stops header, total should still be told in the same round. Removing an earlier entry from the array you are looping over moves every later one back a place, and the loop skips one: loop over a copy.'
      ),
      kase(
        'A listener added during a round waits for the next',
        'added',
        ['| change 1:', 'header', 'total', '| change 2:', 'header', 'total', 'note'],
        'subscribe(header) where header subscribes note the first time it is told, subscribe(total), then two changes',
        'note started listening during change 1, so its first change is change 2. A round tells everyone who was listening when it began: loop over a copy of the listeners made at that moment.'
      )
    ])
  }
}
