# Rate limiter

## The problem

A public API has to say no sometimes. One buggy script in a loop, or one person refreshing too fast, can use up the capacity everyone else needs. A **rate limiter** sits in front of each request and answers one question: may this caller go ahead right now?

In this challenge you build three limiters, each a little smarter than the last. All of them track callers by a string `key`, such as a user id or an IP address, and every caller is limited on their own.

## Constraints

- Every limiter takes a `now` option: a function that returns the current time in milliseconds. It defaults to `Date.now`. The hidden tests pass a fake clock, so never read the time any other way.
- Do not use timers (`setTimeout`, `setInterval`). Every decision is made from the current time and what you stored.
- A call should be fast. Do not keep data that can never matter again.
- Use TypeScript that Node can run directly: explicit `.ts` import extensions, no enums, no parameter properties.

## Task 1: fixed window

Split time into windows of `windowMs`, aligned to zero. With `windowMs: 1000` the windows are 0 to 999, 1000 to 1999 and so on. Each key may make `limit` requests per window.

```ts
const limiter = createFixedWindowLimiter({ limit: 2, windowMs: 1000, now })
// t=900 allow('ada') -> true
// t=950 allow('ada') -> true
// t=999 allow('ada') -> false
// t=1000 allow('ada') -> true   (a new window)
```

It is cheap and simple, with one weak spot: two requests at 900 and 950 and two more at 1000 and 1001 all pass. That is four requests in about 100 ms.

## Task 2: sliding window

The sliding window removes that burst. At time `T`, count the requests this key was allowed in the last `windowMs`, meaning times `t` with `T - windowMs < t <= T`. If there are fewer than `limit`, allow and record the time.

```ts
const limiter = createSlidingWindowLimiter({ limit: 2, windowMs: 1000, now })
// t=900 -> true, t=950 -> true
// t=1000 -> false   (900 and 950 are still within the last second)
// t=1900 -> true    (900 has left the window)
```

Only allowed requests are recorded. A caller who keeps getting refused should not be locked out for longer because of it.

## Task 3: token bucket

Many real APIs use a token bucket because it allows short bursts while holding a steady average. Each key has a bucket that holds up to `capacity` tokens and starts full. Tokens drip back in at `refillPerSecond`, continuously, so half a token after 250 ms at 2 per second is fine. A request costs `cost` tokens (default 1) and is allowed only when the bucket holds enough.

```ts
const bucket = createTokenBucket({ capacity: 2, refillPerSecond: 2, now })
// t=0   take('ada') -> true, take('ada') -> true, take('ada') -> false
// t=250 tokens('ada') -> 0.5
// t=500 take('ada') -> true
```

A refused take removes nothing. `tokens(key)` reports the current amount without changing it beyond bringing the bucket up to date.

## How it is checked

Run `node src/demo.ts` to see each limiter's decisions on the same six requests. The check replays hidden scenarios with a fake clock, including window edges, gaps longer than a window, several keys, costs larger than the bucket and a run without the `now` option. It also type-checks each file.
