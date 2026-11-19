// Task 1: Fixed window
//
// createFixedWindowLimiter({ limit, windowMs, now }) returns { allow(key) }.
// - Time is split into windows aligned to 0: [0, windowMs), [windowMs, 2 * windowMs), ...
// - allow(key) returns true and counts the request when that key has made fewer than `limit`
//   allowed requests in the current window. Otherwise it returns false.
// - Keys are counted separately.
// - `now` returns the current time in milliseconds. It defaults to Date.now.
export interface WindowOptions {
  limit: number
  windowMs: number
  now?: () => number
}

export interface Limiter {
  allow(key: string): boolean
}

export function createFixedWindowLimiter(options: WindowOptions): Limiter {
  throw new Error('Not implemented')
}
