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
  options: DebounceOptions = {}
): Debounced<A> {
  throw new Error('Not implemented')
}
