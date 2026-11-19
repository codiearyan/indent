// Task 2: Sliding window
//
// createSlidingWindowLimiter({ limit, windowMs, now }) returns { allow(key) }.
// - allow(key) at time T returns true when that key has fewer than `limit` allowed requests
//   with a time t where T - windowMs < t <= T. The request is then recorded and counts later.
// - Rejected requests are not recorded and never count against the key.
// - Keys are counted separately. Memory per key stays at most `limit` timestamps.
import type { Limiter, WindowOptions } from './fixedWindow.ts'

export function createSlidingWindowLimiter(options: WindowOptions): Limiter {
  throw new Error('Not implemented')
}
