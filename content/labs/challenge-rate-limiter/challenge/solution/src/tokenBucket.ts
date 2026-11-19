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

export function createTokenBucket({
  capacity,
  refillPerSecond,
  now = Date.now
}: BucketOptions): TokenBucket {
  const buckets = new Map<string, { tokens: number; at: number }>()

  function refill(key: string): { tokens: number; at: number } {
    const time = now()
    const bucket = buckets.get(key) ?? { tokens: capacity, at: time }
    bucket.tokens = Math.min(capacity, bucket.tokens + ((time - bucket.at) / 1000) * refillPerSecond)
    bucket.at = time
    buckets.set(key, bucket)
    return bucket
  }

  return {
    take(key, cost = 1) {
      const bucket = refill(key)
      if (bucket.tokens < cost) return false
      bucket.tokens -= cost
      return true
    },
    tokens(key) {
      return refill(key).tokens
    }
  }
}
