// Run with: node src/demo.ts
// A fake clock so you can see each limiter's decisions step by step.
import { createFixedWindowLimiter } from './fixedWindow.ts'
import { createSlidingWindowLimiter } from './slidingWindow.ts'
import { createTokenBucket } from './tokenBucket.ts'

let time = 0
const now = (): number => time
const times = [900, 950, 1000, 1001, 1900, 1950]

function show(label: string, create: () => (key: string) => boolean): void {
  try {
    const decide = create()
    const decisions = times.map((t) => {
      time = t
      return `${t}ms:${decide('ada') ? 'yes' : 'no'}`
    })
    console.log(label, decisions.join(' '))
  } catch (err) {
    console.log(label, `Error: ${(err as Error).message}`)
  }
}

show('fixed window   (2 per 1000ms):', () => {
  const limiter = createFixedWindowLimiter({ limit: 2, windowMs: 1000, now })
  return (key) => limiter.allow(key)
})
show('sliding window (2 per 1000ms):', () => {
  const limiter = createSlidingWindowLimiter({ limit: 2, windowMs: 1000, now })
  return (key) => limiter.allow(key)
})
show('token bucket   (2, 2 per sec):', () => {
  const bucket = createTokenBucket({ capacity: 2, refillPerSecond: 2, now })
  return (key) => bucket.take(key)
})
