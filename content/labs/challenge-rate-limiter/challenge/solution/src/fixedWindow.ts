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

export function createFixedWindowLimiter({
  limit,
  windowMs,
  now = Date.now
}: WindowOptions): Limiter {
  const counters = new Map<string, { window: number; count: number }>()
  return {
    allow(key) {
      const window = Math.floor(now() / windowMs)
      const counter = counters.get(key)
      if (!counter || counter.window !== window) {
        counters.set(key, { window, count: 1 })
        return limit > 0
      }
      if (counter.count >= limit) return false
      counter.count += 1
      return true
    }
  }
}
