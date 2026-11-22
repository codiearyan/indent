// Copied into the sandbox as .grader/drive.mjs. Builds test files out of groups, hooks and only.
import * as runner from '../src/runner.js'
import { earlier, needs, never, shown, wait, within } from './helpers.mjs'

const NEEDS = {
  describe: 'This task needs describe() from task 1, which does not work yet.',
  beforeEach: 'This task needs beforeEach() from task 2, which does not work yet.'
}

// Each layout adds tests the way a test file would. `log` records what ran, in order.
const LAYOUTS = {
  oneGroup({ test, describe }, log) {
    describe('cards', () => {
      test('one colour', () => log('one colour'))
      test('two colours', () => log('two colours'))
    })
  },
  nested({ test, describe }, log) {
    describe('quote', () => {
      describe('cards', () => test('bulk price', () => log('bulk price')))
      test('unknown item', () => log('unknown item'))
    })
  },
  after({ test, describe }, log) {
    describe('paper', () => test('in stock', () => log('in stock')))
    test('job book', () => log('job book'))
  },
  calledAtOnce({ test, describe }, log) {
    describe('paper', () => {
      log('group body')
      test('in stock', () => log('in stock'))
    })
    log(`tests saved: ${Array.isArray(runner.tests) ? runner.tests.length : 'none'}`)
  },
  topHook({ test, beforeEach }, log) {
    beforeEach(() => log('hook'))
    test('first', () => log('first'))
    test('second', () => log('second'))
  },
  groupHook({ test, describe, beforeEach }, log) {
    describe('job book', () => {
      beforeEach(() => log('hook'))
      test('inside', () => log('inside'))
    })
    test('outside', () => log('outside'))
  },
  hookOrder({ test, describe, beforeEach }, log) {
    beforeEach(() => log('top hook'))
    describe('outer', () => {
      beforeEach(() => log('outer hook'))
      describe('inner', () => {
        beforeEach(() => log('inner hook'))
        test('deep', () => log('deep'))
      })
    })
  },
  hookBelow({ test, describe, beforeEach }, log) {
    describe('job book', () => {
      test('written first', () => log('written first'))
      beforeEach(() => log('hook'))
    })
  },
  asyncHook({ test, beforeEach }, log) {
    beforeEach(async () => {
      log('hook start')
      await wait(30)
      log('hook end')
    })
    test('after setup', () => log('after setup'))
  },
  hookThrows({ test, describe, beforeEach }, log, thrown) {
    describe('job book', () => {
      beforeEach(() => {
        thrown.hook = new Error('Job book would not open')
        throw thrown.hook
      })
      test('adds a job', () => log('adds a job'))
    })
    describe('paper', () => test('in stock', () => log('in stock')))
  },
  oneOnly({ test }, log) {
    test('first', () => log('first'))
    test.only('chosen', () => log('chosen'))
    test('third', () => log('third'))
  },
  twoOnly({ test }, log) {
    test.only('chosen one', () => log('chosen one'))
    test('skipped', () => log('skipped'))
    test.only('chosen two', () => log('chosen two'))
  },
  noOnly({ test }, log) {
    test('first', () => log('first'))
    test('second', () => log('second'))
  },
  onlyTimeout({ test }, log) {
    test('skipped', () => log('skipped'))
    test.only('asks the supplier', () => {
      log('asks the supplier')
      return never()
    }, { timeout: 50 })
  },
  onlyInGroup({ test, describe }, log) {
    describe('cards', () => {
      test('skipped', () => log('skipped'))
      test.only('chosen', () => log('chosen'))
    })
    test('also skipped', () => log('also skipped'))
  }
}

export async function layoutCase(layout, subject) {
  const events = []
  const thrown = {}
  const log = (event) => events.push(event)
  // Each part of the runner but the one this task is about is wrapped, so a part from an earlier
  // task that does not work yet is named instead of crashing the case.
  const wrap = (what, fn) => (what === subject ? fn : (...args) => needs(NEEDS[what], () => fn(...args)))
  const test = (...args) => runner.test(...args)
  test.only = (...args) => runner.test.only(...args)
  const parts = {
    test,
    describe: wrap('describe', runner.describe),
    beforeEach: wrap('beforeEach', runner.beforeEach)
  }
  LAYOUTS[layout](parts, log, thrown)
  const outcome = await within(5000, runner.run())
  if (outcome.hung) return { hung: true, events }
  const results = Array.isArray(outcome.value) ? outcome.value : []
  if (subject !== 'describe' && results.some((r) => ['job book > outside', 'job book > paper > in stock'].includes(r?.name))) {
    earlier('This task needs describe() from task 1: a test after a group still carries that group\'s name.')
  }
  return {
    events,
    results: results.map((r) => ({
      name: r?.name,
      passed: r?.passed,
      error: r?.error === undefined ? '(none)' : shown(r.error),
      fromHook: thrown.hook !== undefined && r?.error === thrown.hook
    }))
  }
}

export function onlyChecksArgs() {
  try {
    runner.test.only('totals')
    return { threw: false, saved: runner.tests.length }
  } catch (err) {
    return { threw: true, typeError: err instanceof TypeError, error: shown(err), saved: runner.tests.length }
  }
}
