// Task 3: Token bucket
//
// createTokenBucket({ capacity, refillPerSecond, now }) returns { take(key, cost), tokens(key) }.
// - Each key has its own bucket that starts full, holding `capacity` tokens.
// - Tokens refill continuously at `refillPerSecond`, so 250 ms at 2 per second adds 0.5 tokens.
//   A bucket never holds more than `capacity`.
// - take(key, cost = 1) returns true and removes `cost` tokens when the bucket holds at least
//   `cost`. Otherwise it returns false and removes nothing.
// - tokens(key) returns how many tokens the bucket holds right now, fractions included.
// - `now` returns the current time in milliseconds. It defaults to Date.now.
export interface BucketOptions {
  capacity: number
  refillPerSecond: number
  now?: () => number
}

export interface TokenBucket {
  take(key: string, cost?: number): boolean
  tokens(key: string): number
}

export function createTokenBucket(options: BucketOptions): TokenBucket {
  throw new Error('Not implemented')
}
