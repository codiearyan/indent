// Copied into the sandbox as .grader/drive.mjs. Drives the learner's runner with tests that wait.
import * as runner from '../src/runner.js'
import { earlier, needs, never, shown, unhandled, wait, within } from './helpers.mjs'

// Each plan entry is [name, what the test does, options]. Built here, because functions do not
// travel as JSON.
function plan(entries, events, thrown) {
  return entries.map(([name, does, options]) => {
    const fn = {
      waitPass: async () => {
        events.push(`${name} start`)
        await wait(30)
        events.push(`${name} end`)
      },
      waitFail: async () => {
        events.push(`${name} start`)
        await wait(30)
        events.push(`${name} end`)
        thrown[name] = new Error('No paper for posters')
        throw thrown[name]
      },
      rejectNow: async () => {
        events.push(`${name} start`)
        thrown[name] = new Error('Paper list is empty')
        throw thrown[name]
      },
      quickReject: () => {
        events.push(`${name} start`)
        thrown[name] = new Error('Ink is low')
        return Promise.reject(thrown[name])
      },
      syncPass: () => {
        events.push(`${name} start`)
        events.push(`${name} end`)
      },
      syncFail: () => {
        events.push(`${name} start`)
        thrown[name] = new Error('Price is 0')
        throw thrown[name]
      },
      slow: async () => {
        events.push(`${name} start`)
        await wait(60)
        events.push(`${name} end`)
      },
      never: () => {
        events.push(`${name} start`)
        return never()
      }
    }[does]
    return [name, fn, options]
  })
}

export async function waitCase(entries, guardMs = 4000, needsTask1 = false) {
  const events = []
  const thrown = {}
  const specs = plan(entries, events, thrown)
  needs('This task needs test() to still save tests.', () => {
    for (const [name, fn, options] of specs) {
      if (options) runner.test(name, fn, options)
      else runner.test(name, fn)
    }
  })
  if (!Array.isArray(runner.tests) || runner.tests.length !== specs.length) {
    earlier('This task needs test() to still save every test in the tests list.')
  }
  const started = Date.now()
  const returned = runner.run()
  const isPromise = typeof returned?.then === 'function'
  if (needsTask1 && !isPromise) {
    earlier('This task needs task 1 first: run() does not return a promise yet, so it does not wait for any test.')
  }
  const outcome = await within(guardMs, returned)
  const ms = Date.now() - started
  // The results as they were when run() said it was done, before late tests can add to them.
  const results = Array.isArray(outcome.value) ? [...outcome.value] : outcome.value
  // Give a test the runner did not wait for the time to finish, so its effects show.
  await wait(80)
  if (outcome.hung) return { hung: true, isPromise, events, ms }
  if (!Array.isArray(results)) return { isPromise, events, notArray: true, got: shown(results) }
  if (needsTask1 && results.length !== specs.length) {
    earlier('This task needs task 1 first: run() gave its results before every test had finished.')
  }
  return {
    isPromise,
    events,
    ms,
    unhandled,
    results: results.map((r) => ({
      name: r?.name,
      passed: r?.passed,
      error: r?.error === undefined ? '(none)' : shown(r.error),
      isError: r?.error instanceof Error,
      sameError: r?.name in thrown ? r.error === thrown[r.name] : null
    }))
  }
}
