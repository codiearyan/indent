// Tasks: Retry with backoff, then Stop when asked
//
// retry(task, options) calls task({ attempt, signal }) until it resolves, and resolves with its value.
// options: { attempts = 4, baseMs = 100, signal, sleep }
// - attempt counts from 1
// - an error whose retryable property is not true: reject with it at once
// - a retryable error: if attempts are left, await sleep(baseMs * 2 ** (attempt - 1), { signal })
//   and try again. After the last attempt, reject with the last error
// Stop when asked (signal is an AbortSignal and may be missing):
// - if signal is already aborted, reject with signal.reason without calling task
// - once signal is aborted, start no new attempt and no new sleep, and reject with signal.reason,
//   even if the attempt in progress then fails or the sleep finishes anyway
// sleep defaults to sleep from sleep.js. The check passes a fake that records every delay.
import { sleep as realSleep } from './sleep.js'

export function retry(task, { attempts = 4, baseMs = 100, signal, sleep = realSleep } = {}) {
  throw new Error('Not implemented')
}
