import { runCases } from '../../checks-helpers.mjs'

const showEnd = (v) =>
  v.threw
    ? `then() threw ${v.threw}`
    : [
        v.seen?.length ? `callbacks got: ${v.seen.map((s) => (typeof s === 'string' ? s : s.value)).join(', ')}` : '',
        v.meanwhile ? `docket from then(), while the returned docket waited: ${v.meanwhile}` : '',
        `docket from then(): ${v.end.state}${v.end.state === 'pending' ? '' : `, value ${v.end.value}`}`,
        v.escaped?.length ? `an error escaped: ${v.escaped[0]}` : ''
      ]
        .filter(Boolean)
        .join('\n')

const fulfilledWith = (v) => !v.threw && v.end.state === 'fulfilled' && v.end.same

export const checks = {
  'new-docket'(t) {
    const shape = (v) => (v.threw ? `then() threw ${v.threw}` : `then() returned ${v.same ? 'the same docket it was called on' : v.got}`)
    return runCases(t, 'then()', [
      {
        name: 'Returns a new Docket',
        run: 'newDocketCase',
        args: ['one'],
        pass: (v) => v.isDocket && !v.same,
        show: shape,
        setup: 'docket.then(onFulfilled) on a pending docket',
        hint: (v) =>
          v?.same
            ? 'then() returned the docket it was called on. That docket already has its own value; the next step needs a docket of its own.'
            : 'then() should return a new Docket, made inside then().'
      },
      {
        name: 'A new one for every then()',
        run: 'newDocketCase',
        args: ['two'],
        pass: (v) => v.isDocket && v.secondIsDocket && !v.same && !v.sameAsFirst,
        show: (v) => `${shape(v)}\nthe second then() returned ${v.sameAsFirst ? 'the same docket as the first' : v.secondIsDocket ? 'another Docket' : v.secondGot}`,
        setup: 'two then() calls on the same pending docket',
        hint: 'Two then() calls are two different next steps, so each call returns a Docket of its own.'
      },
      {
        name: 'Kept once the callback has run',
        run: 'newDocketCase',
        args: ['one'],
        pass: (v) => v.isDocket && !v.same && v.before === 'pending' && v.during === 'pending' && v.after === 'fulfilled' && v.calls === 1,
        show: (v) =>
          v.isDocket && !v.same
            ? `docket from then() before: ${v.before}\nwhile the callback ran: ${v.during ?? 'the callback did not run'}\nafter resolve: ${v.after}\ncallback ran ${v.calls} time(s)`
            : shape(v),
        setup: "then(onFulfilled) on a pending docket, then resolve({ item: 'kraft', sheets: 300 })",
        hint: (v) =>
          v?.before && v.before !== 'pending'
            ? 'The docket from then() settled before the first docket did. It should wait until the callback has run.'
            : v?.during && v.during !== 'pending'
              ? 'The docket from then() was already kept while the callback was still running. Keep it once the callback has finished.'
              : 'The new docket stays pending until the callback has run, and then it is kept. Something has to call its resolve at that moment.'
      }
    ])
  },

  'values-flow-on'(t) {
    return runCases(t, 'then()', [
      {
        name: 'Kept with what the callback returned',
        run: 'flowCase',
        args: [[['value', 'words']]],
        pass: fulfilledWith,
        show: showEnd,
        setup: "then((stock) => 'Friday') on a docket kept with { item: 'kraft', sheets: 300 }",
        hint: (v) =>
          v?.end?.state === 'fulfilled'
            ? "The docket from then() was kept, but with something other than what the callback returned. Keep it with the callback's return value."
            : 'Once the callback has run, the docket from then() is kept with whatever the callback returned.'
      },
      {
        name: 'Each step gets the value before it',
        run: 'flowCase',
        args: [[['value', 'nine'], ['value', 'words'], ['value', 'kraft']]],
        pass: (v) => fulfilledWith(v) && v.seen.join(' | ') === "{ item: 'kraft', sheets: 300 } | 9 | 'Friday'",
        show: showEnd,
        setup: "three then() calls in a row: the first returns 9, the second returns 'Friday', the third returns an object",
        hint: 'Each callback should get what the callback before it returned, and the last docket is kept with what the last callback returned.'
      },
      {
        name: 'A callback that returns nothing',
        run: 'flowCase',
        args: [[['undefined']]],
        pass: (v) => !v.threw && v.end.state === 'fulfilled' && v.end.value === 'undefined',
        show: showEnd,
        setup: 'then((stock) => { console.log(stock) }), a callback with no return',
        hint: 'A callback that returns nothing has still finished. The docket from then() is kept, with undefined.'
      },
      {
        name: 'An onFulfilled that is not a function passes the value on',
        run: 'flowCase',
        args: [[['skip'], ['value', 'words']]],
        pass: (v) => fulfilledWith(v) && v.seen.join() === "{ item: 'kraft', sheets: 300 }",
        show: showEnd,
        setup: "then('not a function', onRejected), then then((stock) => 'Friday'), on a docket kept with { item: 'kraft', sheets: 300 }",
        hint: (v) =>
          v?.seen?.length && v.seen[0] !== "{ item: 'kraft', sheets: 300 }"
            ? 'The value reached the next step, but not unchanged. With no onFulfilled, the docket from then() is kept with the same value.'
            : v?.threw
              ? 'A string is not a callback, but your then() tried to call it. When onFulfilled is not a function, the value is passed on unchanged.'
              : 'With no onFulfilled, nothing changes the value, so the docket from then() is kept with the same value and the next step gets it.'
      },
      {
        name: 'Works on a docket already kept',
        run: 'flowCase',
        args: [[['value', 'nine'], ['value', 'words']], 'settled'],
        pass: fulfilledWith,
        show: showEnd,
        setup: "two then() calls in a row on a docket that was already kept: the first returns 9, the second 'Friday'",
        hint: 'A docket that is already kept runs its callback straight away. The docket from then() should be kept with what it returned all the same.'
      }
    ])
  },

  'returned-dockets'(t) {
    const hint = (v) =>
      v?.valueIsDocket
        ? 'The docket from then() was kept with a Docket as its value. When a callback returns a docket, wait for that docket and settle with its result instead.'
        : v?.meanwhile && v.meanwhile !== 'pending' && !v.innerSettled
          ? 'The docket from then() settled before the docket the callback returned. It has to wait for it.'
          : 'When a callback returns a Docket, the docket from then() settles the same way that one does, with its value or its reason.'
    return runCases(t, 'then()', [
      {
        name: 'Waits for a docket kept later',
        run: 'returnedCase',
        args: ['keptLater'],
        pass: (v) => !v.threw && v.meanwhile === 'pending' && fulfilledWith(v),
        show: showEnd,
        setup: "then(() => queueDocket), where queueDocket is kept with { day: 'Friday' } a moment later",
        hint
      },
      {
        name: 'Fails when the returned docket fails',
        run: 'returnedCase',
        args: ['failedLater'],
        pass: (v) => !v.threw && v.meanwhile === 'pending' && v.end.state === 'rejected' && v.end.same,
        show: showEnd,
        setup: "then(() => queueDocket), where queueDocket fails with Error('The press queue is full') a moment later",
        hint: (v) =>
          v?.end?.state === 'pending' && !v.valueIsDocket
            ? 'The returned docket failed, but the docket from then() never settled. Listen for its failure as well as its value.'
            : hint(v)
      },
      {
        name: 'Uses a returned docket that is already kept',
        run: 'returnedCase',
        args: ['keptNow'],
        pass: fulfilledWith,
        show: showEnd,
        setup: "then(() => queueDocket), where queueDocket was already kept with { day: 'Friday' }",
        hint
      },
      {
        name: 'The next step gets the value, not the docket',
        run: 'returnedCase',
        args: ['thenNext'],
        pass: (v) => fulfilledWith(v) && v.seen.length === 1 && v.seen[0].same,
        show: showEnd,
        setup: "then(() => queueDocket).then(next), where queueDocket is kept with { day: 'Friday' } a moment later",
        hint
      }
    ])
  }
}
