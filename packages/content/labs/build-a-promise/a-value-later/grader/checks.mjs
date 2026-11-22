import { runCases } from '../../checks-helpers.mjs'

const endWith = (note) => (v) =>
  v.constructorThrew
    ? `new Docket threw ${v.error}`
    : `state: ${v.end.state}\nvalue: ${v.end.value}${v.end.state !== 'pending' && !v.end.same ? ` (not ${note})` : ''}${v.threw?.length ? `\na later call threw ${v.threw[0]}` : ''}`
const showEnd = endWith('the value that was given')
const showFirst = endWith('the first value it was given')
const showThrown = endWith('what was thrown')

const settledAs = (state) => (v) => v.functions !== false && v.end?.state === state && v.end.same

const NO_FUNCTIONS =
  'The executor should be called with two functions, resolve and reject, that belong to this docket.'

export const checks = {
  settle(t) {
    return runCases(t, 'The Docket constructor', [
      {
        name: 'Runs the executor at once',
        run: 'settleCase',
        args: ['start'],
        pass: (v) => v.calls === 1 && v.log.join() === 'before new Docket,executor,after new Docket' && v.functions,
        show: (v) =>
          `what happened, in order: ${v.log.join(', ')}\nexecutor called ${v.calls} time(s)${v.calls && !v.functions ? ', without two functions' : ''}`,
        setup: 'new Docket(executor)',
        hint: (v) =>
          v?.calls === 1 && !v.functions
            ? NO_FUNCTIONS
            : 'The constructor should call the executor once, right away, before new Docket returns.'
      },
      {
        name: 'Starts pending',
        run: 'settleCase',
        args: ['start'],
        pass: (v) => v.state === 'pending' && v.value === 'undefined',
        show: (v) => `state: ${v.state}\nvalue: ${v.value}`,
        setup: 'new Docket(executor), where the executor does not call resolve or reject',
        hint: 'Until resolve or reject is called, the docket is pending and holds no value.'
      },
      {
        name: 'Keeps a value that arrives later',
        run: 'settleCase',
        args: ['later'],
        pass: (v) => v.meanwhile?.state === 'pending' && settledAs('fulfilled')(v),
        show: (v) => (v.functions ? `while waiting: ${v.meanwhile.state}\nafterwards:\n${showEnd(v)}` : 'the executor got no resolve function'),
        setup: 'resolve({ kraft: 300, laid: 85 }) called from a timer 30 ms after new Docket',
        hint: (v) =>
          v && !v.functions
            ? NO_FUNCTIONS
            : 'Calling resolve(value), even long after the constructor has returned, should set state to fulfilled and value to that very value.'
      },
      {
        name: 'Fails with the reason it was given',
        run: 'settleCase',
        args: ['reject'],
        pass: settledAs('rejected'),
        show: (v) => (v.functions ? showEnd(v) : 'the executor got no reject function'),
        setup: "reject(new Error('No paper listed for napkin'))",
        hint: (v) =>
          v && !v.functions ? NO_FUNCTIONS : 'Calling reject(reason) should set state to rejected and value to that very reason.'
      },
      {
        name: 'Keeps a value that is falsy',
        run: 'settleCase',
        args: ['zero'],
        pass: settledAs('fulfilled'),
        show: (v) => (v.functions ? showEnd(v) : 'the executor got no resolve function'),
        setup: 'resolve(0)',
        hint: (v) =>
          v && !v.functions
            ? NO_FUNCTIONS
            : 'No sheets left is still an answer. Any value can keep a docket, including 0, so do not decide anything by looking at the value.'
      }
    ])
  },

  once(t) {
    const stays = (v) => v.end.state === v.firstState && v.end.same && v.threw.length === 0
    const hint = (v) =>
      v?.threw?.length
        ? 'A later call should do nothing at all. Throwing makes whoever called it crash.'
        : 'Once a docket is settled it never changes. Every later call to resolve or reject has to be ignored.'
    return runCases(t, 'The Docket constructor', [
      {
        name: 'A second resolve is ignored',
        run: 'onceCase',
        args: ['resolve', 'resolve'],
        pass: stays,
        show: showFirst,
        setup: "resolve({ kraft: 300, laid: 85 }), then resolve('other')",
        hint
      },
      {
        name: 'A reject after resolve is ignored',
        run: 'onceCase',
        args: ['resolve', 'reject'],
        pass: stays,
        show: showFirst,
        setup: "resolve({ kraft: 300, laid: 85 }), then reject(new Error('Second answer'))",
        hint
      },
      {
        name: 'A resolve after reject is ignored',
        run: 'onceCase',
        args: ['reject', 'resolve'],
        pass: stays,
        show: showFirst,
        setup: "reject(new Error('No paper listed for napkin')), then resolve('other')",
        hint
      },
      {
        name: 'Many later calls are all ignored',
        run: 'onceCase',
        args: ['reject', 'reject+resolve+reject'],
        pass: stays,
        show: showFirst,
        setup: "reject(new Error('No paper listed for napkin')), then reject, resolve and reject again",
        hint
      },
      {
        name: 'Kept with undefined still counts as settled',
        run: 'onceCase',
        args: ['resolve', 'resolve-undefined'],
        pass: stays,
        show: showFirst,
        setup: "resolve(undefined), then resolve('other')",
        hint: (v) =>
          v?.threw?.length
            ? hint(v)
            : 'A docket kept with undefined is settled all the same. Decide whether it is settled by its state, not by its value.'
      }
    ])
  },

  'throwing-executor'(t) {
    const rejectedWithThrown = (v) => !v.constructorThrew && v.end.state === 'rejected' && v.end.same
    const THREW = 'new Docket should not throw. When the executor throws, catch it and fail the docket with what was thrown.'
    const or = (text) => (v) => (v?.constructorThrew ? THREW : text)
    return runCases(t, 'The Docket constructor', [
      {
        name: 'A thrown Error fails the docket',
        run: 'throwCase',
        args: ['error'],
        pass: rejectedWithThrown,
        show: showThrown,
        setup: "new Docket(() => { throw new Error('Ink on the count sheet') })",
        hint: or('The docket should be rejected, and its value should be the very Error that was thrown.')
      },
      {
        name: 'A thrown string fails it too',
        run: 'throwCase',
        args: ['string'],
        pass: rejectedWithThrown,
        show: showThrown,
        setup: "new Docket(() => { throw 'out of ink' })",
        hint: or('Anything can be thrown, not only an Error. Keep what was thrown as it is.')
      },
      {
        name: 'A thrown undefined fails it too',
        run: 'throwCase',
        args: ['undefined'],
        pass: rejectedWithThrown,
        show: showThrown,
        setup: 'new Docket(() => { throw undefined })',
        hint: (v) =>
          v?.constructorThrew
            ? THREW
            : v?.end?.state === 'rejected'
              ? 'The docket failed, but its value is not what was thrown. Keep what was thrown as it is, even undefined.'
              : 'The executor threw, so the docket failed, even though what it threw is undefined. Decide by whether it threw, not by what it threw.'
      },
      {
        name: 'A throw after resolve changes nothing',
        run: 'throwCase',
        args: ['afterResolve'],
        pass: (v) => !v.constructorThrew && v.end.state === 'fulfilled' && v.end.same,
        show: showFirst,
        setup: "new Docket((resolve) => { resolve({ kraft: 300, laid: 85 }); throw new Error('Smudge after the count') })",
        hint: or('The docket was already kept when the executor threw. A settled docket never changes, so the throw has to go through the same rule as every other late call.')
      },
      {
        name: 'A throw after reject keeps the first reason',
        run: 'throwCase',
        args: ['afterReject'],
        pass: (v) => !v.constructorThrew && v.end.state === 'rejected' && v.end.same,
        show: showFirst,
        setup: "new Docket((resolve, reject) => { reject(new Error('No paper listed for napkin')); throw new Error('Smudge after the count') })",
        hint: or('The docket had already failed with its first reason. A later throw must not replace it.')
      }
    ])
  }
}
