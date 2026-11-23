import { runCases } from '../../checks-helpers.mjs'

const json = (value) => (value === undefined ? 'undefined' : JSON.stringify(value))
// Tasks 2 and 3 run on the check's own store and price list, so task 1 cannot hold them up.
const own = (t) => ({
  'src/store.js': t.chapterPath('solution/src/store.js'),
  'src/price-list.js': t.chapterPath('grader/price-list.js')
})
const START = 'a basket of 60 menu and 500 tag'
const showBasket = (v) => `basket: ${v.lines.join(', ') || 'empty'}\nlisteners told ${v.told} time(s)`

function basketHint(v, otherwise) {
  if (!v) return otherwise
  if (!v.oldKept) {
    return 'The basket the store had before was changed in place. Build a new array, and a new line object for a line that changes: the old state has to stay as it was.'
  }
  if (!v.newArray && v.told === 0) {
    return "The basket did not reach the store as a change. setState with the very same array changes nothing, so nobody is told: give it a new array."
  }
  return otherwise
}

export const checks = {
  actions(t) {
    return runCases(t, 'createStore()', [
      {
        name: 'Actions are kept on store.actions',
        run: 'actionsCase',
        args: ['kept'],
        pass: (v) => v.has === 'function' && v.returned === 'now 5' && v.jobs === 5 && json(v.told) === '[5]',
        show: (v) =>
          v.has === 'function'
            ? `store.actions.more(4) returned ${json(v.returned)}\njobs is ${v.jobs}, listeners told with jobs ${v.told.join(', ') || 'never'}`
            : `store.actions.more is ${v.has}`,
        setup: 'createStore({ jobs: 1 }, makeActions) where makeActions returns { more(n) }, which adds n to jobs and returns a sentence, then store.actions.more(4)',
        hint: (v) =>
          v?.has !== 'function'
            ? 'Call makeActions and keep the object it returns as the store\'s actions property, so store.actions.more is the function it made.'
            : 'Keep the actions as makeActions made them: called with its own arguments, an action changes the state through the store and returns what it returns.'
      },
      {
        name: 'makeActions is called once, with the store',
        run: 'actionsCase',
        args: ['once'],
        pass: (v) => v.calls === 1 && v.same,
        show: (v) => `makeActions called ${v.calls} time(s)${v.calls ? (v.same ? ', with the store' : ', with something other than the store createStore returned') : ''}`,
        setup: 'createStore({ jobs: 1 }, makeActions)',
        hint: (v) =>
          v?.calls === 1
            ? 'Give makeActions the very store object createStore returns, so its actions can reach getState, setState and store.actions.'
            : 'Call makeActions once, when the store is made.'
      },
      {
        name: 'One action can call another',
        run: 'actionsCase',
        args: ['other'],
        pass: (v) => v.jobs === 3,
        show: (v) => `jobs is ${v.jobs}`,
        setup: 'createStore({ jobs: 1 }, makeActions) where twice() calls store.actions.more(1) two times, then store.actions.twice()',
        hint: 'twice() reaches more() through store.actions, so store.actions has to be in place by the time an action runs. Set it on the store object makeActions was given.'
      },
      {
        name: 'Without makeActions, an empty object',
        run: 'actionsCase',
        args: ['none'],
        pass: (v) => v.isObject && json(v.actions) === '{}',
        show: (v) => `store.actions is ${json(v.actions)}`,
        setup: 'createStore({ jobs: 1 }) with no makeActions',
        hint: 'A store made without actions still has store.actions, an empty object, so code that looks for an action finds nothing instead of crashing.'
      },
      {
        name: 'A makeActions that is not a function is refused',
        run: 'actionsCase',
        args: ['bad'],
        pass: (v) => v.bad.threw && v.bad.typeError,
        show: (v) => (v.bad.threw ? `threw ${v.bad.error}` : 'did not throw'),
        setup: "createStore({ jobs: 1 }, 'add')",
        hint: 'makeActions is called once, right away, so a wrong one should fail right away too: throw a TypeError when it is given and is not a function.'
      }
    ])
  },

  basket(t) {
    const kase = (name, kind, pass, setup, hint) => ({
      name,
      run: 'basketCase',
      args: [kind],
      pass: (v) => v.oldKept && pass(v),
      show: showBasket,
      setup: `${START}, then ${setup}`,
      hint: (v) => basketHint(v, hint)
    })
    return runCases(
      t,
      'add(), remove() or reorder()',
      [
        kase('add() puts a new item at the end', 'new', (v) => json(v.lines) === json(['60 menu', '500 tag', '40 poster']) && v.told === 1, "add('poster', 40)", 'A new item gets a line of its own, after the lines already there, in one change.'),
        kase('add() adds to a line already there', 'join', (v) => json(v.lines) === json(['75 menu', '500 tag']) && v.told === 1, "add('menu', 15)", 'menu already has a line, so its quantity goes up and it keeps its place. A basket never has two lines for one item.'),
        kase('remove() takes a line out', 'remove', (v) => json(v.lines) === json(['500 tag']) && v.told === 1, "remove('menu')", "The menu line should go, and every other line stay in its order, in one change."),
        kase('remove() of an item not there changes nothing', 'absent', (v) => json(v.lines) === json(['60 menu', '500 tag']) && v.told === 0, "remove('napkin')", 'There are no napkins in the basket, so this is no change and nobody should be told. filter() always returns a new array, which the store counts as a change: find out first whether the item is there.'),
        kase('reorder() adds each line the way add() does', 'reorder', (v) => json(v.lines) === json(['65 menu', '750 tag', '20 poster']), "reorder([250 tag, 20 poster, 5 menu])", 'Each line of the old order goes in the way add() puts it: tag and menu already have lines, so their quantities go up, and poster gets a new line at the end. Call add() for each line, through store.actions, instead of writing it again. The check calls each action on its own, as a screen does with const { reorder } = store.actions, so inside it this is not the actions object.')
      ],
      { files: own(t) }
    )
  },

  prices(t) {
    const kase = (name, kind, pass, show, setup, hint) => ({ name, run: 'pricesCase', args: [kind], pass, show, setup, hint })
    const NEVER =
      'loadPrices() had not finished a second after the price list answered, so the check stopped waiting. Look for an await on something that never settles.'
    const ended = (v) => `at the end: ${json(v.end)}`
    return runCases(
      t,
      'loadPrices()',
      [
        kase(
          'The screen shows the wait at once',
          'answers',
          (v) => v.atOnce.loading === true && v.atOnce.error === null && v.toldAtOnce && v.calls === 1,
          (v) => `right after loadPrices(): loading ${json(v.atOnce.loading)}, error ${json(v.atOnce.error)}, listeners ${v.toldAtOnce ? 'told' : 'not told'}\nprice list asked ${v.calls} time(s)`,
          'loadPrices() with a price list that answers only when the check says so',
          (v) =>
            v?.calls === 0
              ? 'loadPrices() never asked the price list. Call fetchPrices() from price-list.js.'
              : v?.calls > 1
                ? 'loadPrices() asked the price list more than once. One load is one question.'
                : 'Before waiting, set loading to true and error to null, so the screen can say it is loading while the price list thinks.'
        ),
        kase(
          'The prices are kept when they come',
          'answers',
          (v) => !v.hung && v.end.loading === false && v.pricesSame && v.end.error === null,
          ended,
          'loadPrices(), then the price list answers with prices of its own',
          (v) =>
            v?.hung
              ? NEVER
              : !v?.pricesSame
                ? 'When the price list answers, keep what it gave as prices, the very object.'
                : 'Once the prices are in, loading is false again.'
        ),
        kase(
          'Its promise waits for the prices',
          'answers',
          (v) => v.isPromise && !v.settledEarly && !v.hung && v.rejected === undefined,
          (v) => (v.isPromise ? `the promise ${v.settledEarly ? 'settled before the price list answered' : v.hung ? 'never settled' : 'settled after the prices were set'}` : 'loadPrices() returned no promise'),
          'loadPrices(), the price list answers a moment later',
          (v) =>
            !v?.isPromise
              ? 'loadPrices() returned nothing to wait for. Return a promise that settles once the prices are set: an async function returns one for you.'
              : v.settledEarly
                ? 'The promise settled before the price list had answered, so whoever awaits it would read no prices. Wait for fetchPrices() inside the action.'
                : v.hung
                  ? NEVER
                  : 'The promise rejected. loadPrices() should settle it once the state is set.'
        ),
        kase(
          'A failure is said in the state',
          'fails',
          (v) => !v.hung && v.rejected === undefined && v.end.loading === false && v.end.error === 'The price list is shut for the night.' && v.end.prices === null,
          (v) => `${ended(v)}${v.rejected ? `\nthe promise rejected with ${v.rejected}` : ''}`,
          'loadPrices(), then the price list fails with an Error of its own',
          (v) =>
            v?.hung
              ? NEVER
              : v?.rejected !== undefined
                ? 'The failure escaped as a rejected promise. A button that calls loadPrices() would never see it: catch it in the action, and put its message in the state.'
                : v?.end.loading !== false
                  ? 'After a failure the screen would say loading for ever. Set loading back to false.'
                  : 'Keep the failure\'s message, its text, as error, and leave prices as they were.'
        ),
        kase(
          'A change made while it waits is kept',
          'meanwhile',
          (v) => !v.hung && v.end.note === 'Rush job' && v.pricesSame,
          ended,
          "loadPrices(), then setState({ note: 'Rush job' }) while the price list thinks, then the answer",
          (v) =>
            v?.hung
              ? NEVER
              : v?.end.note !== 'Rush job'
                ? 'The note set while loadPrices() waited was lost when the prices came. A state read before the wait is old by the time the answer comes: set only the keys this action changes.'
                : 'When the price list answers, keep what it gave as prices.'
        ),
        kase(
          'A new load clears the old error',
          'clears',
          (v) => v.atOnce.error === null && v.atOnce.loading === true,
          (v) => `right after loadPrices(): loading ${json(v.atOnce.loading)}, error ${json(v.atOnce.error)}`,
          'a store whose error is set from an earlier failure, then loadPrices()',
          'A new load starts with no error: set error to null with loading, or the screen shows the old failure while the new load runs.'
        )
      ],
      { files: own(t) }
    )
  }
}
