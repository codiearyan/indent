import { runCases } from '../../checks-helpers.mjs'

const escapedLine = (v) => (v.escaped?.length ? `\nan error escaped: ${v.escaped[0]}` : '')
const showLog = (v) => `what happened, in order: ${v.log.join(', ') || 'nothing'}${v.next ? `\ndocket from then(): ${v.next.state}` : ''}${escapedLine(v)}`
const logIs = (...expected) => (v) => v.log.join(' | ') === expected.join(' | ') && !v.escaped.length

const later = (what) => (v) =>
  !v?.log?.includes('callback')
    ? 'The callback never ran. Putting it off is fine, but it still has to run once the current code is done.'
    : `The callback ran inside ${what}, before the code after it. A callback should wait until the code that is running now has finished.`

const timer = (v) =>
  v?.log?.[0] === 'timer'
    ? 'The callback ran after a timer that was set at the same moment. A timer waits behind every timer and every input already waiting. queueMicrotask runs the job as soon as the current code is done, before any timer.'
    : later('then() or resolve()')(v)

const showDocket = (v) =>
  v.threw
    ? `threw ${v.threw}`
    : v.notDocket
      ? `returned ${v.got}, not a Docket`
      : `${v.steps?.length ? `while answers came in: ${v.steps.join(', ')}\n` : ''}${v.waited ? `while nothing had settled: ${v.waited}\n` : ''}docket: ${v.end.state}${v.end.state === 'pending' ? '' : `, value ${v.end.value}`}${v.calls ? `\nits callbacks ran: ${v.calls.join(', ') || 'none'}` : ''}${escapedLine(v)}`

const notDocket = (v, name) => (v?.notDocket ? `${name} should return a new Docket.` : undefined)

export const checks = {
  'always-later'(t) {
    return runCases(t, 'then()', [
      {
        name: 'Not during then(), even on a kept docket',
        run: 'laterCase',
        args: ['thenSettled'],
        pass: logIs('then() called', 'code after then()', 'callback'),
        show: showLog,
        setup: 'then(callback) on a docket that is already kept, then one more line of code',
        hint: later('then()')
      },
      {
        name: 'Not during resolve()',
        run: 'laterCase',
        args: ['resolve'],
        pass: logIs('resolve() called', 'code after resolve()', 'callback'),
        show: showLog,
        setup: 'then(callback) on a pending docket, then resolve(1200), then one more line of code',
        hint: later('resolve()')
      },
      {
        name: 'Not during reject()',
        run: 'laterCase',
        args: ['reject'],
        pass: logIs('reject() called', 'code after reject()', 'callback'),
        show: showLog,
        setup: "then(onFulfilled, onRejected) on a pending docket, then reject(new Error('No paper listed for napkin')), then one more line of code",
        hint: later('reject()')
      },
      {
        name: 'Before a timer, on a kept docket',
        run: 'laterCase',
        args: ['timerSettled'],
        pass: logIs('callback', 'timer'),
        show: showLog,
        setup: 'setTimeout(timer, 0), then then(callback) on a docket that is already kept',
        hint: timer
      },
      {
        name: 'Before a timer, after resolve()',
        run: 'laterCase',
        args: ['timerResolve'],
        pass: logIs('callback', 'timer'),
        show: showLog,
        setup: 'then(callback) on a pending docket, then setTimeout(timer, 0), then resolve(1200)',
        hint: timer
      },
      {
        name: 'In the order then() was called',
        run: 'laterCase',
        args: ['order'],
        pass: logIs('callback 1', 'callback 2', 'callback 3', 'callback 4'),
        show: showLog,
        setup: 'callback 1 on a kept docket, callback 2 on a pending one, resolve it, then callbacks 3 and 4 on each',
        hint: 'Every callback ran, but not in the order then() was called. Jobs put off with queueMicrotask run first in, first out, so queue each one when its turn comes: at then() for a settled docket, at resolve() for one that was waiting.'
      },
      {
        name: 'The executor still runs at once',
        run: 'laterCase',
        args: ['executor'],
        pass: logIs('new Docket called', 'executor', 'code after new Docket'),
        show: showLog,
        setup: 'new Docket(executor) between two lines of code',
        hint: 'Only callbacks wait. The executor still runs right away, inside new Docket, so it can start the work.'
      },
      {
        name: 'A throw in a callback still fails the next docket',
        run: 'laterCase',
        args: ['throwLater'],
        pass: (v) => logIs('code after resolve()')(v) && v.next.state === 'rejected',
        show: showLog,
        setup: 'then(callback) on a pending docket, where the callback throws, then resolve(60)',
        hint: (v) =>
          v?.escaped?.length
            ? 'The throw escaped from a job you put off, so nothing caught it. The try around the callback has to be inside the job that runs it.'
            : 'A callback that throws should still fail the docket from then(), as in the last issue.'
      }
    ])
  },

  all(t) {
    return runCases(t, 'Docket.all()', [
      {
        name: 'Values in the order of the list',
        run: 'allCase',
        args: ['order'],
        pass: (v) => !v.notDocket && v.end.state === 'fulfilled' && v.end.sameItems,
        show: showDocket,
        setup: 'Docket.all of three dockets for card, invite and poster, kept in the order poster, invite, card',
        hint: (v) =>
          notDocket(v, 'Docket.all()') ??
          (v?.end?.array && v.end.length === 3
            ? 'The answers are all there, but not in the order of the list. Put each value at the place of its own docket, not at the end.'
            : 'Once every docket is kept, Docket.all() should be kept with an array of their values, in the order of the list.')
      },
      {
        name: 'Waits for every docket',
        run: 'allCase',
        args: ['waits'],
        pass: (v) => !v.notDocket && v.end.state === 'pending',
        show: showDocket,
        setup: 'Docket.all of three dockets, where the third and second are kept and the first is still waiting',
        hint: (v) =>
          notDocket(v, 'Docket.all()') ??
          'Docket.all() settled while one docket was still waiting. Count the answers that came in; the length of an array you fill by place is not a count.'
      },
      {
        name: 'Fails as soon as one fails',
        run: 'allCase',
        args: ['rejects'],
        pass: (v) => !v.notDocket && v.steps[0] === 'rejected' && v.end.state === 'rejected' && v.end.same,
        show: showDocket,
        setup: "Docket.all of three dockets: one fails with Error('No paper listed for napkin') while another still waits, then that one fails too",
        hint: (v) =>
          notDocket(v, 'Docket.all()') ??
          (v?.end?.state === 'rejected' && !v.end.same
            ? 'Docket.all() failed, but not with the first reason. Once it has failed, later failures change nothing.'
            : 'When one docket fails, the whole answer is lost, so Docket.all() fails at once with that reason. It does not wait for the others.')
      },
      {
        name: 'An empty list gives an empty array',
        run: 'allCase',
        args: ['empty'],
        pass: (v) => !v.notDocket && v.end.state === 'fulfilled' && v.end.array && v.end.length === 0,
        show: showDocket,
        setup: 'Docket.all([])',
        hint: (v) =>
          notDocket(v, 'Docket.all()') ??
          'With nothing to wait for, no answer will ever arrive to finish the count. Docket.all([]) has to be kept with an empty array on its own.'
      },
      {
        name: 'Dockets already kept',
        run: 'allCase',
        args: ['settled'],
        pass: (v) => !v.notDocket && v.end.state === 'fulfilled' && v.end.sameItems,
        show: showDocket,
        setup: 'Docket.all of three dockets that are already kept',
        hint: (v) => notDocket(v, 'Docket.all()') ?? 'Dockets that are already kept count too. Docket.all() should be kept with their values, in order.'
      }
    ])
  },

  race(t) {
    const once = (v) => v.calls.length === 1
    return runCases(t, 'Docket.race()', [
      {
        name: 'Kept by the first to be kept',
        run: 'raceCase',
        args: ['fulfil'],
        pass: (v) => !v.notDocket && v.end.state === 'fulfilled' && v.end.same && once(v),
        show: showDocket,
        setup: 'Docket.race of three dockets: the second is kept first, then the first is kept and the third fails',
        hint: (v) =>
          notDocket(v, 'Docket.race()') ??
          (v?.calls?.length > 1
            ? 'Its callbacks ran more than once, so the race settled more than once. Only the first docket to settle counts.'
            : 'Docket.race() should settle with the value of the first docket to settle. The ones after it change nothing.')
      },
      {
        name: 'Fails when the first to settle fails',
        run: 'raceCase',
        args: ['reject'],
        pass: (v) => !v.notDocket && v.end.state === 'rejected' && v.end.same && once(v),
        show: showDocket,
        setup: "Docket.race of three dockets: the third fails with Error('The press queue is full') first, then the first is kept",
        hint: (v) =>
          notDocket(v, 'Docket.race()') ??
          (v?.end?.state === 'fulfilled'
            ? 'The first docket to settle failed, so the race fails too, with that reason. A later answer does not win.'
            : 'Docket.race() settles the way the first docket to settle does, and that includes failing.')
      },
      {
        name: 'A docket already kept wins',
        run: 'raceCase',
        args: ['settled'],
        pass: (v) => !v.notDocket && v.end.state === 'fulfilled' && v.end.same && once(v),
        show: showDocket,
        setup: 'Docket.race of two pending dockets and one already kept, then a moment later the first pending one is kept',
        hint: (v) => notDocket(v, 'Docket.race()') ?? 'A docket that is already kept has settled first, so the race is kept with its value.'
      },
      {
        name: 'Waits while nothing has settled',
        run: 'raceCase',
        args: ['pending'],
        pass: (v) => !v.notDocket && v.waited === 'pending' && v.end.state === 'pending' && v.calls.length === 0,
        show: showDocket,
        setup: 'Docket.race of three dockets that never settle',
        hint: (v) => notDocket(v, 'Docket.race()') ?? 'Until one of the dockets settles, the race has no answer and stays pending.'
      }
    ])
  }
}
