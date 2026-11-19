// Tasks 1 and 2: Debounce
//
// debounce(fn, waitMs, options?) returns a function that delays calls to fn until calls stop
// for waitMs. A burst is a run of calls with gaps shorter than waitMs; it ends waitMs after the
// last call. options.timers defaults to realTimers from ./timers.ts.
//
// Task 1 (default options)
// - Each call restarts the wait. When the burst ends, fn runs once with the latest arguments.
//
// Task 2
// - options.leading (default false): the first call of a burst runs fn at once.
// - options.trailing (default true): when the burst ends, fn runs with the latest arguments, but
//   only if there was a call that did not already run at the start of the burst.
// - cancel(): drops any pending call and ends the burst. The next call starts a new burst.
// - flush(): if a call is pending, runs it now. Either way the burst ends.
import { realTimers, type Timers } from './timers.ts'

export interface DebounceOptions {
  leading?: boolean
  trailing?: boolean
  timers?: Timers
}

export interface Debounced<A extends unknown[]> {
  (...args: A): void
  cancel(): void
  flush(): void
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs: number,
  { leading = false, trailing = true, timers = realTimers }: DebounceOptions = {}
): Debounced<A> {
  let inBurst = false
  let timer: unknown
  let pending: A | null = null

  const endBurst = (): void => {
    inBurst = false
    const args = pending
    pending = null
    if (trailing && args) fn(...args)
  }

  const debounced = (...args: A): void => {
    const first = !inBurst
    if (inBurst) timers.clearTimeout(timer)
    inBurst = true
    timer = timers.setTimeout(endBurst, waitMs)
    if (first && leading) fn(...args)
    else pending = args
  }

  debounced.cancel = (): void => {
    if (inBurst) timers.clearTimeout(timer)
    inBurst = false
    pending = null
  }

  debounced.flush = (): void => {
    if (!inBurst) return
    timers.clearTimeout(timer)
    endBurst()
  }

  return debounced
}
