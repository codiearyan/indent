import { runCases } from '../../checks-helpers.mjs'

const escapedLine = (v) => (v.escaped?.length ? `\nan error escaped: ${v.escaped[0]}` : '')
const showEnd = (v) =>
  v.thenThrew
    ? `then() threw ${v.thenThrew}${escapedLine(v)}`
    : `${v.settleThrew ? `resolve or reject threw ${v.settleThrew}\n` : ''}docket from then(): ${v.end.state}${v.end.state === 'pending' ? '' : `, value ${v.end.value}`}${escapedLine(v)}`

const rejectedWithThrown = (v) => !v.thenThrew && !v.settleThrew && !v.escaped.length && v.end.state === 'rejected' && v.end.same

const throwHint = (v) =>
  v?.thenThrew || v?.settleThrew || v?.escaped?.length
    ? 'The throw got out of your docket and reached the code that called resolve, reject or then(). Run every callback inside a try, so a throw stays inside.'
    : v?.end?.state === 'rejected'
      ? 'The docket from then() failed, but not with exactly what the callback threw. Keep the thrown value as it is.'
      : 'A callback that throws has failed. The docket from then() should be rejected with what it threw.'

const showCatch = (v) =>
  v.threw
    ? `threw ${v.threw}`
    : !v.isDocket || v.same
      ? `returned ${v.same ? 'the same docket it was called on' : v.got}`
      : `handler got: ${v.calls.join(', ') || 'nothing, it did not run'}\nnew docket: ${v.end.state}${v.end.state === 'pending' ? '' : `, value ${v.end.value}`}${escapedLine(v)}`

const recovered = (v) => v.isDocket && !v.same && v.calls?.join() === 'Error: No paper listed for napkin' && v.end.state === 'fulfilled' && v.end.same

const catchShape = (v, name) =>
  v?.same
    ? `${name} returned the docket it was called on. It should return a new docket, as then() does.`
    : v && !v.isDocket && !v.threw
      ? `${name} should return a new Docket, as then() does.`
      : undefined

const showSkip = (v) =>
  v.threw
    ? `then() threw ${v.threw}`
    : `callbacks that ran: ${v.ran.join(', ') || 'none'}\nthe docket two steps down: ${v.second.state}${v.second.state === 'pending' ? '' : `, value ${v.second.value}`}${escapedLine(v)}`

const skipped = (reason) => (v) =>
  !v.threw && !v.escaped.length && v.second.state === 'rejected' && v.second.same && v.ran.at(-1) === `handler(${reason})` && v.ran.length === (reason.startsWith('Error: Only') ? 2 : 1)

const skipHint = (v) =>
  v?.second?.value?.includes('is not a function')
    ? "A string is not a callback, but your then() tried to call it. When onRejected is not a function, the failure is passed on unchanged."
    : v?.ran?.some((r) => r.startsWith('step 2') || r.startsWith('step 3'))
    ? 'An onFulfilled callback ran after the failure. A failed docket must never run onFulfilled; the failure skips past it.'
    : v?.second?.state === 'fulfilled'
      ? 'A docket further down was kept, though nothing handled the failure. With no onRejected, the docket from then() fails with the same reason.'
      : v?.second?.state === 'pending'
        ? 'The failure stopped at the first then() without an onRejected: the docket it returned never settled. With no onRejected, the docket from then() fails with the same reason.'
        : 'The failure should travel down the chain, unchanged, to the first onRejected.'

export const checks = {
  'throws-in-callbacks'(t) {
    return runCases(t, 'then()', [
      {
        name: 'A throw in onFulfilled fails the next docket',
        run: 'throwCase',
        args: ['onFulfilled', 'later'],
        pass: rejectedWithThrown,
        show: showEnd,
        setup: "then(onFulfilled) on a pending docket, where onFulfilled throws Error('Only 75 kraft sheets, 120 needed'), then resolve(75)",
        hint: throwHint
      },
      {
        name: 'A throw in onRejected fails the next docket',
        run: 'throwCase',
        args: ['onRejected', 'later'],
        pass: rejectedWithThrown,
        show: showEnd,
        setup: "then(undefined, onRejected) on a pending docket, where onRejected throws Error('Only 75 kraft sheets, 120 needed'), then reject(...)",
        hint: throwHint
      },
      {
        name: 'A throw on a docket already kept',
        run: 'throwCase',
        args: ['onFulfilled', 'settled'],
        pass: rejectedWithThrown,
        show: showEnd,
        setup: 'then(onFulfilled) on a docket already kept, where onFulfilled throws',
        hint: throwHint
      },
      {
        name: 'A thrown string fails it too',
        run: 'throwCase',
        args: ['onFulfilled', 'later', 'string'],
        pass: rejectedWithThrown,
        show: showEnd,
        setup: "then(onFulfilled), where onFulfilled throws 'out of ink', then resolve(75)",
        hint: throwHint
      },
      {
        name: 'One throwing callback does not stop the others',
        run: 'othersCase',
        pass: (v) => v.ran.join() === 'first,second' && !v.settleThrew && !v.escaped.length,
        show: (v) => `callbacks that ran: ${v.ran.join(', ') || 'none'}${v.settleThrew ? `\nresolve threw ${v.settleThrew}` : ''}${escapedLine(v)}`,
        setup: 'two then() calls on one pending docket, the first callback throws, then resolve(75)',
        hint: 'The first callback threw, and the second one never ran. Each callback has its own next docket, so one throw must not stop the rest.'
      }
    ])
  },

  catch(t) {
    return runCases(t, 'catch()', [
      {
        name: 'catch() runs its handler on a failure',
        run: 'catchCase',
        args: ['reject', 'value'],
        pass: (v) => v.isDocket && !v.same && v.calls?.join() === 'Error: No paper listed for napkin',
        show: showCatch,
        setup: "catch(handler) on a docket that then fails with Error('No paper listed for napkin')",
        hint: (v) => catchShape(v, 'catch()') ?? 'catch(handler) should run the handler once, with the reason the docket failed with.'
      },
      {
        name: 'What the handler returns keeps the new docket',
        run: 'catchCase',
        args: ['reject', 'value'],
        pass: recovered,
        show: showCatch,
        setup: "catch(() => ({ item: 'kraft', sheets: 0 })) on a docket that then fails",
        hint: (v) =>
          catchShape(v, 'catch()') ??
          (v?.end?.state === 'rejected'
            ? 'The handler took the failure, so the chain should carry on: the new docket is kept with what the handler returned.'
            : 'The new docket should be kept with what the handler returned, just as with onFulfilled.')
      },
      {
        name: 'then(undefined, handler) carries on too',
        run: 'catchCase',
        args: ['reject', 'value', 'then'],
        pass: recovered,
        show: showCatch,
        setup: "then(undefined, () => ({ item: 'kraft', sheets: 0 })) on a docket that then fails",
        hint: (v) =>
          v?.end?.state === 'pending'
            ? 'onRejected ran, but the docket from then() never settled. What onRejected returns should keep it, just as with onFulfilled.'
            : 'What onRejected returns should keep the docket from then(), just as with onFulfilled.'
      },
      {
        name: 'catch() on a kept docket passes the value on',
        run: 'catchCase',
        args: ['fulfil', 'value'],
        pass: (v) => v.isDocket && !v.same && v.calls?.length === 0 && v.end.state === 'fulfilled' && v.end.same,
        show: showCatch,
        setup: 'catch(handler) on a docket that is then kept with 75',
        hint: (v) =>
          catchShape(v, 'catch()') ??
          (v?.calls?.length
            ? 'The handler ran on a docket that was kept. It is only for failures.'
            : 'Nothing failed, so the new docket should be kept with the same value.')
      },
      {
        name: 'A handler that returns a docket is waited for',
        run: 'catchCase',
        args: ['reject', 'docket'],
        pass: recovered,
        show: showCatch,
        setup: "catch(() => recount), where recount is a docket kept with { item: 'kraft', sheets: 0 } a moment later",
        hint: (v) =>
          catchShape(v, 'catch()') ??
          'When the handler returns a docket, the new docket waits for it and settles the same way, as with onFulfilled.'
      }
    ])
  },

  'skip-ahead'(t) {
    return runCases(t, 'then()', [
      {
        name: 'A failure skips to the first onRejected',
        run: 'skipCase',
        args: ['rejected'],
        pass: skipped('Error: No paper listed for napkin'),
        show: showSkip,
        setup: "a failed docket, then three steps with only onFulfilled (the second has 'not a function' as onRejected), then then(undefined, handler)",
        hint: skipHint
      },
      {
        name: 'A failure that arrives later skips ahead too',
        run: 'skipCase',
        args: ['later'],
        pass: skipped('Error: No paper listed for napkin'),
        show: showSkip,
        setup: 'the same chain on a pending docket, which fails a moment later',
        hint: skipHint
      },
      {
        name: 'A throw skips ahead the same way',
        run: 'skipCase',
        args: ['throw'],
        pass: skipped('Error: Only 75 kraft sheets, 120 needed'),
        show: showSkip,
        setup: "the same chain on a docket kept with 75, where step 1 throws Error('Only 75 kraft sheets, 120 needed')",
        hint: skipHint
      }
    ])
  }
}
