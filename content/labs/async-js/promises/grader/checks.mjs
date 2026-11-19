import { runCases, same } from '../../checks-helpers.mjs'

const fulfilledWith = (expected) => (v) => v.isPromise && v.state === 'fulfilled' && same(v.value, expected)
const rejectedWith = (message) => (v) =>
  v.isPromise && v.state === 'rejected' && v.error.message === message && v.unhandled.length === 0

export const checks = {
  wrap(t) {
    return runCases(t, 'loadTides', [
      {
        name: 'Returns a promise',
        run: 'wrapCase',
        args: ['later'],
        pass: (v) => v.isPromise,
        setup: "loadTides('quay', read), where read answers a moment later",
        hint: 'loadTides should return a promise right away, before read has called back. What creates a new promise you can settle later?'
      },
      {
        name: 'Resolves with the table',
        run: 'wrapCase',
        args: ['later'],
        pass: (v) => v.state === 'fulfilled' && v.value?.[1]?.time === '04:52' && v.value.length === 5 && same(v.ports, ['quay']),
        setup: "loadTides('quay', read), where read calls back with (null, table) a moment later",
        hint: 'When read calls back without an error, the promise should resolve with the table it was given. Check you pass the port to read once.'
      },
      {
        name: 'Rejects with the same error',
        run: 'wrapCase',
        args: ['fail'],
        pass: rejectedWith('Tide gauge offline'),
        setup: "loadTides('quay', read), where read calls back with an Error('Tide gauge offline')",
        hint: 'When the first argument of the callback is an error, the promise should reject with that exact error, not resolve.'
      },
      {
        name: 'Works when read calls back straight away',
        run: 'wrapCase',
        args: ['sync'],
        pass: (v) => v.isPromise && v.state === 'fulfilled' && Array.isArray(v.value),
        setup: "loadTides('quay', read), where read calls back before it returns",
        hint: 'Some callback functions answer immediately. Your promise should still resolve with the table.'
      }
    ])
  },

  chain(t) {
    return runCases(t, 'nextHighTide', [
      {
        name: 'Finds the first high tide',
        run: 'chainCase',
        args: ['00:00'],
        pass: fulfilledWith('04:52 (3.6 m)'),
        setup: "nextHighTide('gull', '00:00', load), table: 02:10 1.0, 04:52 3.6, 11:07 0.9, 17:15 3, 23:31 1.1",
        hint: 'Look for the first tide that is high (3 m or more), skipping low ones. Also check you return the promise from the chain.'
      },
      {
        name: 'Skips tides before the time',
        run: 'chainCase',
        args: ['05:00'],
        pass: fulfilledWith('17:15 (3.0 m)'),
        setup: "nextHighTide('gull', '05:00', load), same table",
        hint: 'Only tides at or after the time count. The height should always show one decimal.'
      },
      {
        name: 'A tide at exactly that time counts',
        run: 'chainCase',
        args: ['17:15'],
        pass: fulfilledWith('17:15 (3.0 m)'),
        setup: "nextHighTide('gull', '17:15', load), same table",
        hint: 'A tide at the same minute as `after` should be included. Check how you compare the times.'
      },
      {
        name: 'Says when there is no high tide left',
        run: 'chainCase',
        args: ['18:00'],
        pass: fulfilledWith('No high tide after 18:00'),
        setup: "nextHighTide('gull', '18:00', load), same table",
        hint: 'When no tide matches, the promise should still resolve, with the sentence from the task and the time that was asked for.'
      },
      {
        name: 'A failed load rejects',
        run: 'chainCase',
        args: ['00:00', true],
        pass: (v) => rejectedWith('Tide gauge offline')(v) && same(v.ports, ['gull']),
        setup: "nextHighTide('gull', '00:00', load), where load rejects with Error('Tide gauge offline')",
        hint: 'A rejection from load should travel down the chain unchanged. Do not catch it and turn it into a sentence.'
      }
    ])
  },

  flatten(t) {
    return runCases(t, 'sailingReport', [
      {
        name: 'Combines the sailing and the sea state',
        run: 'reportCase',
        args: ['ok'],
        pass: fulfilledWith({ route: 'quay-gull', time: '09:30', sea: 'choppy' }),
        setup: "sailingReport('quay-gull', services), sailing { route: 'quay-gull', time: '09:30' }, sea 'choppy'",
        hint: 'The promise should resolve only once the sea state is known. What happens to a promise you return from inside a then callback?'
      },
      {
        name: 'Asks for the sea state after the sailing is known',
        run: 'reportCase',
        args: ['ok'],
        pass: (v) => same(v.events, ['getSailing quay-gull', 'sailing answered', 'getSeaState 09:30']),
        setup: 'the order the fake services were called in',
        hint: 'Call getSailing once with the route, then getSeaState once with the time from that sailing.'
      },
      {
        name: 'A sea state failure rejects the report',
        run: 'reportCase',
        args: ['seaFails'],
        pass: rejectedWith('Sea sensor offline'),
        setup: "getSeaState rejects with Error('Sea sensor offline')",
        hint: 'The report should reject with the error from getSeaState. If that rejection went nowhere, the inner promise is not part of your chain.'
      },
      {
        name: 'A sailing failure rejects the report',
        run: 'reportCase',
        args: ['sailingFails'],
        pass: (v) => rejectedWith('Timetable service is down')(v) && !v.events.some((e) => e.startsWith('getSeaState')),
        setup: "getSailing rejects with Error('Timetable service is down')",
        hint: 'When getSailing fails, reject with its error and do not ask for the sea state at all.'
      }
    ])
  }
}
