import { runCases, runScripts } from '../../checks-helpers.mjs'

const NEVER = 'Your run() never finished, so the check stopped waiting for it. A test whose promise never settles kept it waiting forever.'

const showResults = (v) => {
  if (v.hung) return `run() had not finished after ${v.ms} ms\ntests started: ${v.events.filter((e) => e.endsWith('start')).length}`
  if (v.notArray) return `run() gave ${v.got}, not a list of results`
  if (v.results.length === 0) return 'run() gave an empty list of results'
  const lines = v.results.map((r) => `${r.name}: passed ${r.passed}${r.passed ? '' : `, error ${r.error}`}`)
  return lines.join('\n')
}
const showOrder = (v) => `${v.hung ? 'run() never finished\n' : ''}what happened, in order: ${v.events.join(', ')}`
const ok = (v) => !v.hung && !v.notArray
const verdicts = (v) => (ok(v) ? v.results.map((r) => r.passed) : [])
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

export const checks = {
  async await(t) {
    const cases = await runCases(t, 'run()', [
      {
        name: 'run() returns a promise',
        run: 'waitCase',
        args: [[['counts the paper', 'syncPass']]],
        pass: (v) => v.isPromise,
        show: (v) => (v.isPromise ? 'run() returned a promise' : 'run() returned its results straight away, not a promise'),
        setup: 'one test, then run()',
        hint: 'A runner that waits for tests has to return before they are done. What kind of function always returns a promise?'
      },
      {
        name: 'A test that waits and passes',
        run: 'waitCase',
        args: [[['waits for the paper', 'waitPass']]],
        pass: (v) => ok(v) && same(verdicts(v), [true]) && v.events.includes('waits for the paper end'),
        show: showResults,
        setup: 'one async test that waits 30 ms and then returns',
        hint: (v) => (v?.hung ? NEVER : 'The results should come once the test has finished. Wait for the promise its function returns.')
      },
      {
        name: 'A test that waits and then fails',
        run: 'waitCase',
        args: [[['waits for the poster paper', 'waitFail']]],
        pass: (v) => ok(v) && same(verdicts(v), [false]) && v.results[0].sameError === true,
        show: showResults,
        setup: "one async test that waits 30 ms and then throws Error('No paper for posters')",
        hint: (v) =>
          v?.hung
            ? NEVER
            : "This test's promise rejects a moment after it starts. If the runner does not wait for it, it looks like a pass. The rejection value is the failed result's error."
      },
      {
        name: 'An async test that throws at once',
        run: 'waitCase',
        args: [[['reads an empty list', 'rejectNow']]],
        pass: (v) => ok(v) && same(verdicts(v), [false]) && v.results[0].sameError === true,
        show: showResults,
        setup: "one async function that throws Error('Paper list is empty') before it waits for anything",
        hint: (v) => (v?.hung ? NEVER : 'An async function that throws does not throw at the call. It returns a promise that rejects. That still fails the test.')
      },
      {
        name: 'Tests that do not wait still work',
        run: 'waitCase',
        args: [[['adds the setup', 'syncPass'], ['rounds to pence', 'syncFail']]],
        pass: (v) => ok(v) && same(verdicts(v), [true, false]) && v.results[1].sameError === true,
        show: showResults,
        setup: "two plain tests: one returns, one throws Error('Price is 0')",
        hint: (v) => (v?.hung ? NEVER : 'Plain functions that return or throw should still pass or fail as before.')
      }
    ])
    const program = await runScripts(t, 'main()', [
      {
        name: 'main() waits before it reports',
        args: ['waitFail'],
        pass: (v) => v.code === 1 && v.stdout.includes('FAIL waits for the paper'),
        show: (v) => `exit code ${v.code}\nprinted:\n${v.stdout.trim() || '(nothing)'}${v.stderr.trim() ? `\nerrors:\n${v.stderr.trim()}` : ''}`,
        setup: 'a test file with one async test that fails after 30 ms, ending in await main()',
        hint: 'main() should wait for the results of run() before it prints the report and sets the exit code.'
      }
    ])
    return [...cases, ...program]
  },

  'in-order'(t) {
    return runCases(t, 'run()', [
      {
        name: 'The next test waits for the one before',
        run: 'waitCase',
        args: [[['first', 'waitPass'], ['second', 'syncPass']]],
        pass: (v) => same(v.events, ['first start', 'first end', 'second start', 'second end']) && ok(v),
        show: showOrder,
        setup: "two tests: 'first' waits 30 ms, 'second' does not wait",
        hint: (v) => (v?.hung ? NEVER : "'second' should start only once 'first' has finished. Starting them all at once and waiting at the end is not one at a time.")
      },
      {
        name: 'A test that fails late still finishes first',
        run: 'waitCase',
        args: [[['first', 'waitFail'], ['second', 'syncPass']]],
        pass: (v) => same(v.events, ['first start', 'first end', 'second start', 'second end']) && same(verdicts(v), [false, true]),
        show: (v) => `${showOrder(v)}\n${showResults(v)}`,
        setup: "two tests: 'first' waits 30 ms and then fails, 'second' passes",
        hint: (v) => (v?.hung ? NEVER : 'A failure after waiting is still the end of that test. Only then should the next one start.')
      },
      {
        name: 'Three tests, one at a time',
        run: 'waitCase',
        args: [[['first', 'slow'], ['second', 'waitPass'], ['third', 'syncPass']]],
        pass: (v) =>
          same(v.events, ['first start', 'first end', 'second start', 'second end', 'third start', 'third end']) &&
          same(verdicts(v), [true, true, true]),
        show: showOrder,
        setup: "three tests: 'first' waits 60 ms, 'second' waits 30 ms, 'third' does not wait",
        hint: (v) => (v?.hung ? NEVER : 'Each test has to finish before the next starts, so the order of events follows the order of the tests.')
      }
    ])
  },

  async timeout(t) {
    const cases = await runCases(t, 'run()', [
      {
        name: 'A test that never finishes fails at its limit',
        run: 'waitCase',
        args: [[['asks the supplier', 'never', { timeout: 50 }], ['counts the paper', 'syncPass']], 4000, true],
        pass: (v) =>
          ok(v) &&
          same(verdicts(v), [false, true]) &&
          v.results[0].isError &&
          v.results[0].error === 'Error: Timed out after 50 ms',
        show: showResults,
        setup: "test('asks the supplier', fn, { timeout: 50 }), where fn's promise never settles, then a test that passes",
        hint: (v) =>
          v?.hung
            ? NEVER
            : "When the time limit runs out, the test fails with an Error whose message is 'Timed out after 50 ms', and the next test runs."
      },
      {
        name: 'A slow test inside its limit passes',
        run: 'waitCase',
        args: [[['reads the stock', 'slow', { timeout: 400 }]], 4000, true],
        pass: (v) => ok(v) && same(verdicts(v), [true]),
        show: showResults,
        setup: "test('reads the stock', fn, { timeout: 400 }), where fn takes 60 ms",
        hint: (v) => (v?.hung ? NEVER : 'The limit comes from the options passed to test(). A test that finishes in time passes.')
      },
      {
        name: 'A failure inside the limit keeps its own error',
        run: 'waitCase',
        args: [[['checks the ink', 'quickReject', { timeout: 1000 }]], 4000, true],
        pass: (v) => ok(v) && same(verdicts(v), [false]) && v.results[0].sameError === true,
        show: showResults,
        setup: "test('checks the ink', fn, { timeout: 1000 }), where fn rejects at once with Error('Ink is low')",
        hint: (v) => (v?.hung ? NEVER : 'When the test fails before its limit, its own error is the one to keep, not a timeout.')
      },
      {
        name: 'The limit is 2000 ms when none is given',
        run: 'waitCase',
        args: [[['asks the supplier', 'never']], 6000, true],
        pass: (v) => ok(v) && same(verdicts(v), [false]) && v.results[0].error === 'Error: Timed out after 2000 ms' && v.ms >= 1900 && v.ms < 5000,
        show: (v) => `${showResults(v)}\nrun() took ${v.ms} ms`,
        setup: "test('asks the supplier', fn) with no options, where fn's promise never settles",
        hint: (v) => (v?.hung ? NEVER : 'Without options, a test still gets a time limit: 2000 ms, and the message says so.')
      }
    ])
    const program = await runScripts(t, 'main()', [
      {
        name: 'A quick test does not keep the program open',
        args: ['quickLongLimit'],
        pass: (v) => v.code === 0 && v.ms < 3000,
        show: (v) => `exit code ${v.code}, the program ended after ${v.ms} ms${v.timedOut ? ' (stopped by the check)' : ''}`,
        setup: "a test file with one quick test and { timeout: 6000 }, ending in await main()",
        hint: (v) =>
          v && v.code !== 0
            ? `The program ended with exit code ${v.code}, though its one test passes. If main() does not wait for run() yet, finish task 1 first.`
            : 'The test passed at once, but the program stayed open until its time limit ran out. A timer that is still waiting keeps Node running. Stop it once the test is over.'
      }
    ])
    return [...cases, ...program]
  }
}
