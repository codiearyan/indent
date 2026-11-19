import { runCases, same } from '../../checks-helpers.mjs'

const IDS = ['quay-gull', 'quay-heron', 'gull-heron']
const PORTS = ['quay', 'gull', 'heron', 'reef']
const fulfilledWith = (expected) => (v) => v.state === 'fulfilled' && same(v.value, expected)

export const checks = {
  all(t) {
    return runCases(t, 'loadRoutes', [
      {
        name: 'Keeps the order of the ids',
        run: 'routesCase',
        args: [IDS, [...IDS].reverse()],
        pass: fulfilledWith([
          { id: 'quay-gull', minutes: 25 },
          { id: 'quay-heron', minutes: 40 },
          { id: 'gull-heron', minutes: 30 }
        ]),
        setup: `loadRoutes(${JSON.stringify(IDS)}), answers arrive last id first`,
        hint: 'The routes should come back in the order of the ids, not the order the answers arrived in.'
      },
      {
        name: 'Starts every request at once',
        run: 'routesCase',
        args: [IDS, [...IDS].reverse()],
        pass: (v) => same(v.startedFirst, IDS),
        setup: 'the requests that had started before any answer arrived',
        hint: 'Every getRoute call should start before you wait for any of them. A loop with await inside waits for each one in turn.'
      },
      {
        name: 'Rejects when one route fails',
        run: 'routesCase',
        args: [IDS, ['quay-heron', 'quay-gull', 'gull-heron'], 'quay-heron'],
        pass: (v) => v.state === 'rejected' && v.error.message === 'Route quay-heron is closed' && v.unhandled.length === 0,
        setup: "getRoute('quay-heron') rejects with Error('Route quay-heron is closed') before the others answer",
        hint: 'One failed route should reject the whole result with that error, without leaving anything unhandled.'
      },
      {
        name: 'An empty list resolves with []',
        run: 'routesCase',
        args: [[], []],
        pass: (v) => v.isPromise && fulfilledWith([])(v),
        setup: 'loadRoutes([])',
        hint: 'With no ids there is nothing to load, but the function should still return a promise of an empty array.'
      }
    ])
  },

  settled(t) {
    return runCases(t, 'portStatus', [
      {
        name: 'Sorts ports into up and down',
        run: 'portsCase',
        args: [PORTS, ['reef', 'heron', 'gull', 'quay'], ['gull', 'reef']],
        pass: fulfilledWith({
          up: ['quay', 'heron'],
          down: [
            { port: 'gull', reason: 'No answer from gull' },
            { port: 'reef', reason: 'No answer from reef' }
          ]
        }),
        setup: `portStatus(${JSON.stringify(PORTS)}), gull and reef reject, answers arrive in reverse`,
        hint: 'Every port belongs in exactly one list, in the order of the input, and a down port carries the message of its error.'
      },
      {
        name: 'Pings every port at once',
        run: 'portsCase',
        args: [PORTS, PORTS, []],
        pass: (v) => same(v.startedFirst, PORTS),
        setup: 'the pings that had started before any answer arrived',
        hint: 'Start every ping before you wait for any of them.'
      },
      {
        name: 'Never rejects, even when every port is down',
        run: 'portsCase',
        args: [['gull', 'reef'], ['gull', 'reef'], ['gull', 'reef']],
        pass: (v) =>
          fulfilledWith({
            up: [],
            down: [
              { port: 'gull', reason: 'No answer from gull' },
              { port: 'reef', reason: 'No answer from reef' }
            ]
          })(v) && v.unhandled.length === 0,
        setup: 'both pings reject',
        hint: 'A failed ping is an answer, not an error. Which way of waiting for many promises never rejects?'
      },
      {
        name: 'No ports gives empty lists',
        run: 'portsCase',
        args: [[], [], []],
        pass: fulfilledWith({ up: [], down: [] }),
        setup: 'portStatus([])',
        hint: 'With no ports, resolve with two empty lists.'
      }
    ])
  },

  timeout(t) {
    return runCases(t, 'withTimeout', [
      {
        name: 'Starts one timer for ms',
        run: 'timeoutCase',
        args: ['resolves'],
        pass: (v) => v.isPromise && v.before.state === 'pending' && same(v.before.timers.map((x) => x.ms), [500]),
        setup: 'withTimeout(work, 500, fakeClock), before anything settles',
        hint: 'Return a promise that is still pending, and ask the timers you were given for exactly one timeout of ms.'
      },
      {
        name: 'Passes the value through and clears the timer',
        run: 'timeoutCase',
        args: ['resolves'],
        pass: (v) => fulfilledWith('on time')(v) && v.timers[0]?.cleared === true,
        setup: "work resolves with 'on time' before the timer fires",
        hint: 'When the work wins, resolve with its value and clear the timer with clearTimeout, so nothing is left waiting.'
      },
      {
        name: 'Passes a rejection through and clears the timer',
        run: 'timeoutCase',
        args: ['rejects'],
        pass: (v) => v.state === 'rejected' && v.error.message === 'Gauge broke' && v.timers[0]?.cleared === true,
        setup: "work rejects with Error('Gauge broke') before the timer fires",
        hint: 'A failure of the work should come through unchanged, and the timer should be cleared in this case too.'
      },
      {
        name: 'Rejects with a TimeoutError when time runs out',
        run: 'timeoutCase',
        args: ['timesOut'],
        pass: (v) => v.state === 'rejected' && v.error.name === 'TimeoutError' && v.error.message.includes('500'),
        setup: 'the timer fires while the work is still pending',
        hint: "When the timer fires first, reject with an Error whose name is 'TimeoutError' and whose message mentions the number of milliseconds."
      },
      {
        name: 'A late failure is not left unhandled',
        run: 'timeoutCase',
        args: ['timesOut'],
        pass: (v) => v.state === 'rejected' && v.unhandled.length === 0,
        setup: "the timer fires, then the work rejects with Error('Late failure')",
        hint: 'The work can still fail after you gave up on it. Something must be listening to it, or Node reports an unhandled rejection.'
      }
    ])
  }
}
