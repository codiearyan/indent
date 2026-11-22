import { runCases } from '../../checks-helpers.mjs'

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const names = (v) => v.results.map((r) => r.name)
const showNames = (v) => (v.hung ? 'run() never finished' : `result names: ${JSON.stringify(names(v))}`)
const showEvents = (v) =>
  v.hung
    ? 'run() never finished'
    : `what ran, in order: ${v.events.join(', ') || 'nothing'}\n${v.results.map((r) => `${r.name}: passed ${r.passed}${r.passed ? '' : `, error ${r.error}`}`).join('\n')}`

function layout(name, which, pass, show, setup, hint) {
  return { name, run: 'layoutCase', args: [which], pass: (v) => !v.hung && pass(v), show, setup, hint }
}

// The part of the runner each task is about, so the drive never reports it as an earlier task.
const about = (subject, cases) => cases.map((c) => (c.run === 'layoutCase' ? { ...c, args: [...c.args, subject] } : c))

export const checks = {
  describe(t) {
    return runCases(t, 'describe()', about('describe', [
      layout(
        'Tests in a group carry its name',
        'oneGroup',
        (v) => same(names(v), ['cards > one colour', 'cards > two colours']),
        showNames,
        "describe('cards', ...) with the tests 'one colour' and 'two colours' inside",
        "A test inside a group is named after the group first, then ' > ', then its own name."
      ),
      layout(
        'Groups inside groups',
        'nested',
        (v) => same(names(v), ['quote > cards > bulk price', 'quote > unknown item']),
        showNames,
        "describe('quote') holding describe('cards') with 'bulk price', then the test 'unknown item' in 'quote' only",
        'A test inside two groups carries both names, outermost first. After the inner group ends, its name is no longer added.'
      ),
      layout(
        'Tests after a group are not in it',
        'after',
        (v) => same(names(v), ['paper > in stock', 'job book']),
        showNames,
        "describe('paper') with 'in stock' inside, then the test 'job book' outside any group",
        'Once the group function has returned, the group is over. Tests added later should keep their own names.'
      ),
      layout(
        'The group function runs straight away',
        'calledAtOnce',
        (v) => same(v.events.slice(0, 2), ['group body', 'tests saved: 1']),
        (v) => `what happened, in order: ${v.events.join(', ')}`,
        "describe('paper', fn) where fn adds one test, then the number of saved tests is read",
        'describe should call its function at once, so the tests inside it are saved before anything runs.'
      ),
      layout(
        'Grouped tests still run',
        'nested',
        (v) => same(v.events, ['bulk price', 'unknown item']) && v.results.every((r) => r.passed),
        showEvents,
        "describe('quote') holding describe('cards') with 'bulk price', then 'unknown item'",
        'Tests inside groups should run in the order they were written, and pass when their functions return.'
      )
    ]))
  },

  'before-each'(t) {
    return runCases(t, 'beforeEach()', about('beforeEach', [
      layout(
        'Outside any group it runs before every test',
        'topHook',
        (v) => same(v.events, ['hook', 'first', 'hook', 'second']),
        showEvents,
        "beforeEach(hook) at the top, then the tests 'first' and 'second'",
        'A hook outside any group belongs to the whole file. It should run once before each test.'
      ),
      layout(
        'Inside a group it runs only for that group',
        'groupHook',
        (v) => same(v.events, ['hook', 'inside', 'outside']),
        showEvents,
        "describe('job book') with beforeEach(hook) and the test 'inside', then the test 'outside' after the group",
        'A hook belongs to the group it was written in. Tests outside that group should not run it.'
      ),
      layout(
        'Outer hooks run before inner ones',
        'hookOrder',
        (v) => same(v.events, ['top hook', 'outer hook', 'inner hook', 'deep']),
        showEvents,
        "a top hook, then describe('outer') with a hook, holding describe('inner') with a hook and the test 'deep'",
        'A test in nested groups runs every hook that applies to it, starting from the outermost.'
      ),
      layout(
        'A hook written below a test still applies',
        'hookBelow',
        (v) => same(v.events, ['hook', 'written first']),
        showEvents,
        "describe('job book') with the test 'written first', and beforeEach(hook) after it",
        'A hook applies to every test in its group, wherever in the group it was written. Decide which hooks apply when the test runs, not when it is added.'
      ),
      layout(
        'An async hook is waited for',
        'asyncHook',
        (v) => same(v.events, ['hook start', 'hook end', 'after setup']),
        showEvents,
        "beforeEach with an async hook that waits 30 ms, then the test 'after setup'",
        'The test should start only once its hooks have finished, the same way tests wait for each other.'
      ),
      layout(
        'A hook that throws fails the test',
        'hookThrows',
        (v) =>
          same(v.events, ['in stock']) &&
          v.results.length === 2 &&
          v.results[0].passed === false &&
          v.results[0].fromHook &&
          v.results[1].passed === true,
        showEvents,
        "describe('job book') with a hook that throws Error('Job book would not open') and the test 'adds a job', then describe('paper') with the test 'in stock'",
        "When a hook throws, its test fails with the hook's error and the test's own function does not run. Tests in other groups are not affected."
      )
    ]))
  },

  only(t) {
    return runCases(t, 'test.only()', about('only', [
      layout(
        'Only the chosen test runs',
        'oneOnly',
        (v) => same(v.events, ['chosen']) && same(names(v), ['chosen']),
        showEvents,
        "test('first'), test.only('chosen'), test('third')",
        'When any test was added with test.only, the others should not run at all, and only the chosen ones are in the results.'
      ),
      layout(
        'Every chosen test runs, in order',
        'twoOnly',
        (v) => same(v.events, ['chosen one', 'chosen two']) && same(names(v), ['chosen one', 'chosen two']),
        showEvents,
        "test.only('chosen one'), test('skipped'), test.only('chosen two')",
        'More than one test can be chosen. All of them run, in the order they were written.'
      ),
      layout(
        'Without test.only every test runs',
        'noOnly',
        (v) => same(v.events, ['first', 'second']),
        showEvents,
        "test('first'), test('second'), no test.only",
        'When no test was chosen, run() runs every test, as before.'
      ),
      layout(
        'A chosen test keeps its time limit',
        'onlyTimeout',
        (v) => same(names(v), ['asks the supplier']) && v.results[0].error === 'Error: Timed out after 50 ms',
        showEvents,
        "test('skipped'), then test.only('asks the supplier', fn, { timeout: 50 }), where fn never finishes",
        'test.only takes the same options as test(), so the time limit applies.'
      ),
      layout(
        'test.only works inside a group',
        'onlyInGroup',
        (v) => same(v.events, ['chosen']),
        showEvents,
        "describe('cards') with test('skipped') and test.only('chosen'), then test('also skipped') outside",
        'A chosen test inside a group is still chosen, and nothing else runs.'
      ),
      {
        name: 'test.only checks its arguments like test()',
        run: 'onlyChecksArgs',
        pass: (v) => v.threw && v.typeError && v.saved === 0,
        show: (v) => `${v.threw ? `threw ${v.error}` : 'did not throw'}, tests saved: ${v.saved}`,
        setup: "test.only('totals') with no function",
        hint: 'test.only adds a test just like test(), so a test without a function is refused the same way, with a TypeError.'
      }
    ]))
  }
}
