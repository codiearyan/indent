import { runCases } from '../../checks-helpers.mjs'

const passedList = (v) => (v.results ? v.results.map((r) => `${r.name}: ${r.passed}`).join(', ') : `run() returned ${v.got}`)
const showRun = (v) => `tests called: ${v.calls.join(', ') || 'none'}\nresults: ${passedList(v)}`
const showErrors = (v) =>
  v.results
    ? v.results.map((r) => `${r.name}: passed ${r.passed}, error ${r.error}${r.sameError === false ? ' (a different value from the one thrown)' : ''}`).join('\n')
    : `run() returned ${v.got}`
const rejects = (v) => v.threw && v.typeError && Array.isArray(v.names) && v.names.length === 0
const showReject = (v) =>
  `${v.threw ? `threw ${v.error}` : 'did not throw'}\ntests now holds ${v.names ? v.names.length : 'no array'}`

export const checks = {
  collect(t) {
    return runCases(t, 'test()', [
      {
        name: 'Adds tests to the list in order',
        run: 'collectCase',
        args: ['order'],
        pass: (v) => v.isArray && JSON.stringify(v.names) === '["ships on time","counts the paper"]' && v.sameFns,
        show: (v) => `tests holds the names ${JSON.stringify(v.names)}${v.isArray && !v.sameFns ? ', but not the same functions that were passed in' : ''}`,
        setup: "test('ships on time', a), then test('counts the paper', b)",
        hint: 'Each call should add one { name, fn } to the end of the exported tests array, keeping the very function it was given.'
      },
      {
        name: 'Does not run the test yet',
        run: 'collectCase',
        args: ['order'],
        pass: (v) => v.calls.length === 0,
        show: (v) => `test functions called while adding: ${v.calls.length}`,
        setup: 'two tests added, and nothing run yet',
        hint: 'Adding a test only saves it. The function should be called later, when the tests are run.'
      },
      {
        name: 'Refuses a test without a function',
        run: 'collectCase',
        args: ['noFn'],
        pass: rejects,
        show: showReject,
        setup: "test('totals') with no function",
        hint: 'A test without a function is a mistake in the test file. Throw a TypeError right away, before anything is added.'
      },
      {
        name: 'Refuses an empty name',
        run: 'collectCase',
        args: ['emptyName'],
        pass: rejects,
        show: showReject,
        setup: "test('', fn)",
        hint: 'An empty string is not a name anyone can read in a report. Throw a TypeError and add nothing.'
      },
      {
        name: 'Refuses a name that is not a string',
        run: 'collectCase',
        args: ['numberName'],
        pass: rejects,
        show: showReject,
        setup: 'test(42, fn)',
        hint: 'Only a string is a name. Look at what you check before adding the test.'
      }
    ])
  },

  run(t) {
    const all = (...expected) => (v) =>
      Array.isArray(v.results) && JSON.stringify(v.results.map((r) => [r.name, r.passed])) === JSON.stringify(expected)
    return runCases(t, 'run()', [
      {
        name: 'A test that returns passes',
        run: 'runCase',
        args: [[['adds the setup fee', 'return']]],
        pass: all(['adds the setup fee', true]),
        show: showRun,
        setup: "one test, 'adds the setup fee', whose function returns",
        hint: 'run() should return a list with one { name, passed } per test. A function that returns has passed.'
      },
      {
        name: 'A test that throws fails',
        run: 'runCase',
        args: [[['rounds to pence', 'error']]],
        pass: all(['rounds to pence', false]),
        show: showRun,
        setup: "one test, 'rounds to pence', whose function throws an Error",
        hint: 'A test fails when its function throws. Your runner has to be ready for that when it calls the function.'
      },
      {
        name: 'A failure does not stop the others',
        run: 'runCase',
        args: [[['first', 'return'], ['second', 'error'], ['third', 'return']]],
        pass: (v) => all(['first', true], ['second', false], ['third', true])(v) && v.calls.join() === 'first,second,third',
        show: showRun,
        setup: "three tests: 'first' returns, 'second' throws, 'third' returns",
        hint: 'After a test throws, the next test must still run, and every test gets a result in the same order they were added.'
      },
      {
        name: 'A thrown string is a failure too',
        run: 'runCase',
        args: [[['checks the stock', 'string']]],
        pass: all(['checks the stock', false]),
        show: showRun,
        setup: "one test that throws the string 'out of card stock', not an Error",
        hint: 'JavaScript can throw any value, not only an Error. Whatever the function throws, the test failed.'
      },
      {
        name: 'Returning false is not a failure',
        run: 'runCase',
        args: [[['returns false', 'false']]],
        pass: all(['returns false', true]),
        show: showRun,
        setup: 'one test whose function returns false',
        hint: 'Only throwing fails a test. What the function returns does not count.'
      }
    ])
  },

  errors(t) {
    const failedWith = (name) => (v) => {
      const r = v.results?.find((x) => x.name === name)
      return v.results?.length === 1 && r && r.passed === false && r.hasError && r.sameError === true
    }
    return runCases(t, 'run()', [
      {
        name: 'Keeps the Error that was thrown',
        run: 'runCase',
        args: [[['rounds to pence', 'error']]],
        pass: failedWith('rounds to pence'),
        show: showErrors,
        setup: "one test that throws new Error('Price is 0')",
        hint: 'The failed result should have an error property holding the very value that was thrown, not a copy and not just its message.'
      },
      {
        name: 'Keeps a thrown object as it is',
        run: 'runCase',
        args: [[['checks the paper', 'object']]],
        pass: failedWith('checks the paper'),
        show: showErrors,
        setup: "one test that throws { code: 'NO_PAPER' }, an object that is not an Error",
        hint: 'Not every thrown value has a message. Keep what was thrown, whatever it is.'
      },
      {
        name: 'A thrown undefined still fails',
        run: 'runCase',
        args: [[['throws nothing useful', 'undefined']]],
        pass: failedWith('throws nothing useful'),
        show: showErrors,
        setup: 'one test that runs `throw undefined`',
        hint: 'The function threw, so the test failed, even though the value thrown is undefined. Decide pass or fail by whether it threw, not by what it threw.'
      },
      {
        name: 'A thrown empty string still fails',
        run: 'runCase',
        args: [[['throws an empty string', 'empty']]],
        pass: failedWith('throws an empty string'),
        show: showErrors,
        setup: "one test that throws ''",
        hint: 'An empty string is falsy, but it was still thrown. The test failed and its error is that empty string.'
      },
      {
        name: 'Every result keeps its own error',
        run: 'runCase',
        args: [[['a', 'error'], ['b', 'return'], ['c', 'object']]],
        pass: (v) =>
          v.results?.length === 3 &&
          v.results[0].sameError === true &&
          v.results[1].passed === true &&
          ['(none)', 'undefined'].includes(v.results[1].error) &&
          v.results[2].sameError === true,
        show: showErrors,
        setup: "three tests: 'a' throws an Error, 'b' returns, 'c' throws an object",
        hint: 'Each failed result holds what its own test threw, and a passed result has no error.'
      }
    ])
  }
}
