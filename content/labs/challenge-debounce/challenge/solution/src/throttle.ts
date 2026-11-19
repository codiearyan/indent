// Task 3: Throttle
//
// throttle(fn, waitMs, options?) returns a function that runs fn at most once per waitMs and
// never loses the last call. options.timers defaults to realTimers from ./timers.ts.
// - A call while no window is open runs fn at once and opens a window of waitMs.
// - Calls while a window is open only remember their arguments (the latest wins).
// - When a window closes, if a call was remembered, fn runs with those arguments and a new
//   window opens. Otherwise throttling stops until the next call.
// - cancel(): drops any remembered call and closes the window.
// Use one timer per window: the check counts how many timers you start.
import { realTimers, type Timers } from './timers.ts'

export interface ThrottleOptions {
  timers?: Timers
}

export interface Throttled<A extends unknown[]> {
  (...args: A): void
  cancel(): void
}

export function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs: number,
  { timers = realTimers }: ThrottleOptions = {}
): Throttled<A> {
  let open = false
  let timer: unknown
  let pending: A | null = null

  const run = (args: A): void => {
    open = true
    timer = timers.setTimeout(closeWindow, waitMs)
    fn(...args)
  }

  const closeWindow = (): void => {
    open = false
    const args = pending
    pending = null
    if (args) run(args)
  }

  const throttled = (...args: A): void => {
    if (open) pending = args
    else run(args)
  }

  throttled.cancel = (): void => {
    if (open) timers.clearTimeout(timer)
    open = false
    pending = null
  }

  return throttled
}
