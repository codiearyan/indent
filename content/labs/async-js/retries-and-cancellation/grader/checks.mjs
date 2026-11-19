import { runCases, same } from '../../checks-helpers.mjs'

const rejectedWith = (message) => (v) => v.state === 'rejected' && v.error.message === message
const aborted = (v) => v.state === 'rejected' && v.error.name === 'AbortError'

export const checks = {
  backoff(t) {
    return runCases(t, 'retry', [
      {
        name: 'Succeeds after retryable failures',
        run: 'backoffCase',
        args: [['retry', 'retry', 'ok']],
        pass: (v) =>
          v.state === 'fulfilled' &&
          v.value === 'manifest on attempt 3' &&
          same(v.attempts, [1, 2, 3]) &&
          same(v.sleeps, [100, 200]),
        setup: 'attempts 1 and 2 fail with a retryable error, attempt 3 works; default options',
        hint: 'Call task({ attempt, signal }) with attempt counting from 1, and wait baseMs * 2 ** (attempt - 1) before each new try.'
      },
      {
        name: 'Gives up after the last attempt',
        run: 'backoffCase',
        args: [['retry', 'retry', 'retry', 'retry', 'retry']],
        pass: (v) =>
          rejectedWith('Harbour server busy (attempt 4)')(v) && same(v.attempts, [1, 2, 3, 4]) && same(v.sleeps, [100, 200, 400]),
        setup: 'every attempt fails with a retryable error; default options (4 attempts, baseMs 100)',
        hint: 'Stop after the number of attempts, reject with the last error, and do not wait after the final failure.'
      },
      {
        name: 'Does not retry other errors',
        run: 'backoffCase',
        args: [['fatal']],
        pass: (v) => rejectedWith('No such sailing')(v) && same(v.attempts, [1]) && same(v.sleeps, []),
        setup: "attempt 1 fails with an Error('No such sailing') that has no retryable property",
        hint: 'Only errors whose retryable property is true are worth another try. Reject with any other error straight away.'
      },
      {
        name: 'Uses the attempts and baseMs options',
        run: 'backoffCase',
        args: [['retry', 'retry', 'retry', 'retry'], { attempts: 3, baseMs: 50 }],
        pass: (v) =>
          rejectedWith('Harbour server busy (attempt 3)')(v) && same(v.attempts, [1, 2, 3]) && same(v.sleeps, [50, 100]),
        setup: 'retry(task, { attempts: 3, baseMs: 50 }), every attempt fails with a retryable error',
        hint: 'Read attempts and baseMs from the options, falling back to 4 and 100 only when they are missing.'
      },
      {
        name: 'No wait when the first try works',
        run: 'backoffCase',
        args: [['ok']],
        pass: (v) => v.state === 'fulfilled' && v.value === 'manifest on attempt 1' && same(v.sleeps, []),
        setup: 'attempt 1 works',
        hint: 'When the first attempt succeeds, resolve with its value without sleeping.'
      }
    ])
  },

  sleep(t) {
    return runCases(t, 'sleep', [
      {
        name: 'Resolves when the timer fires',
        run: 'sleepCase',
        args: ['noSignal'],
        pass: (v) => v.before.state === 'pending' && same(v.before.timers.map((x) => x.ms), [250]) && v.state === 'fulfilled',
        setup: 'sleep(250, fakeClock) without a signal, then the timer fires',
        hint: 'Start one timer of ms with the setTimeout you were given, and resolve when it fires.'
      },
      {
        name: 'An aborted signal rejects at once',
        run: 'sleepCase',
        args: ['alreadyAborted'],
        pass: (v) => aborted(v) && v.timers.length === 0,
        setup: 'sleep(250, { signal }) where the signal is already aborted',
        hint: 'Check signal.aborted before starting anything. Reject with signal.reason and start no timer.'
      },
      {
        name: 'Aborting while waiting clears the timer',
        run: 'sleepCase',
        args: ['abortDuring'],
        pass: (v) => v.before.state === 'pending' && aborted(v) && v.timers[0]?.cleared === true,
        setup: 'sleep(250, { signal }), then controller.abort() before the timer fires',
        hint: "Listen for the signal's abort event. When it comes, clear the timer so it never fires, and reject."
      },
      {
        name: 'Rejects with the abort reason',
        run: 'sleepCase',
        args: ['customReason'],
        pass: rejectedWith('Bram pressed cancel'),
        setup: "controller.abort(new Error('Bram pressed cancel')) while sleeping",
        hint: 'Reject with signal.reason itself, not with an error of your own.'
      },
      {
        name: 'Stops listening once the time is up',
        run: 'sleepCase',
        args: ['cleanup'],
        pass: (v) => v.state === 'fulfilled' && v.listenersLeft === 0,
        setup: 'sleep(250, { signal }), the timer fires, then: abort listeners still attached to the signal',
        hint: 'A signal can live much longer than one sleep. When the timer fires, remove the abort listener you added.'
      }
    ])
  },

  cancel(t) {
    return runCases(t, 'retry', [
      {
        name: 'An aborted signal stops it before the first try',
        run: 'cancelCase',
        args: ['before'],
        pass: (v) => aborted(v) && v.attempts.length === 0,
        setup: 'retry(task, { signal }) where the signal is already aborted',
        hint: 'Before each attempt, check the signal. If it is aborted, reject with signal.reason and do not call task.'
      },
      {
        name: 'Passes the signal on',
        run: 'cancelCase',
        args: ['duringSleep'],
        pass: (v) => v.attempts[0]?.gotSignal === true && v.sleeps[0]?.gotSignal === true,
        setup: 'attempt 1 fails with a retryable error: what task and sleep received',
        hint: 'Give the signal to the task as { attempt, signal } and to sleep as { signal }, so both can stop early.'
      },
      {
        name: 'Aborting during the wait stops the retries',
        run: 'cancelCase',
        args: ['duringSleep'],
        pass: (v) => aborted(v) && v.attempts.length === 1 && v.sleeps.length === 1 && v.unhandled.length === 0,
        setup: 'attempt 1 fails with a retryable error, then controller.abort() during the wait',
        hint: 'Once the signal aborts, reject with signal.reason and never call task again.'
      },
      {
        name: 'Aborting during an attempt stops the retries',
        run: 'cancelCase',
        args: ['duringAttempt'],
        pass: (v) => aborted(v) && v.attempts.length === 1 && v.sleeps.length === 0,
        setup: 'controller.abort() while attempt 1 runs, then attempt 1 fails with a retryable error',
        hint: 'A failure that arrives after an abort is not a reason to wait and try again. Check the signal before you decide to retry.'
      },
      {
        name: 'Checks the signal again after waking',
        run: 'cancelCase',
        args: ['sleepIgnoresAbort'],
        pass: (v) => aborted(v) && v.attempts.length === 1,
        setup: 'attempt 1 fails, the signal aborts during the wait, and the sleep finishes anyway',
        hint: 'Do not trust every sleep to notice the abort. Check the signal again before starting the next attempt.'
      }
    ])
  }
}
