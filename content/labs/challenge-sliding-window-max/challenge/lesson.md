# Sliding window maximum

## The problem

A weather station logs a temperature every minute. A dashboard wants the highest reading of every hour-long window, recomputed as each minute arrives. The direct way looks at all 60 readings for every window. With a year of data and longer windows, that becomes billions of steps.

You solve it the direct way first, then in linear time with a monotonic deque, then reuse the deque to find the longest stretch where readings stay within a limit of each other.

## Constraints

- `windowMax(nums, k)` returns `nums.length - k + 1` values, or `[]` when `k` is larger than the array.
- Neither function may change the array it is given.
- Tasks 2 and 3 run on a million numbers and must finish in under a second. Only O(n) solutions do that reliably.
- Use TypeScript that Node can run directly, with explicit `.ts` import extensions.

## Worked examples

```ts
const temps = [12, 15, 11, 9, 14, 18, 17, 10, 13]
windowMax(temps, 3)      // [15, 15, 14, 18, 18, 18, 17]
windowMax(temps, 20)     // []: no full window
```

```ts
longestWithin(temps, 4)               // 3: for example [12, 15, 11], where 15 - 11 = 4
longestWithin([5, 5, 2, 2, 2, 7], 0)  // 3: the run of 2s
```

## Task 1: the direct way

Look at each window and take its maximum. It is correct, short and good enough for small inputs, which is all this task checks. Watch the edges: the number of windows, an array shorter than `k`, and windows full of negative numbers.

## Task 2: the monotonic deque

When a new number arrives, any older number in the window that is smaller can never be a window maximum again: the new one is larger and will stay in the window longer. So keep only candidates, in a deque of indexes whose values decrease from front to back. The front is the maximum. On each step, drop smaller values from the back, add the new index, and drop the front once its index has left the window. Every index enters and leaves once, so the whole pass is O(n).

The same trick, keeping a stack where each new item removes the smaller ones before it, answers a different question: for each reading, where is the next higher one?

```ts
function nextHigher(readings: number[]): number[] {
  const next = readings.map(() => -1)
  const waiting: number[] = []
  readings.forEach((value, i) => {
    while (waiting.length > 0 && readings[waiting[waiting.length - 1]] < value) {
      next[waiting.pop() as number] = i
    }
    waiting.push(i)
  })
  return next
}
```

## Task 3: longest stretch within a limit

Now the window has no fixed size. Grow it one number at a time, and shrink it from the start while its maximum minus its minimum is over the limit. A max deque and a min deque give both values in O(1), and both ends of the window only move right.

## How it is checked

Run `node src/demo.ts` to see both functions on the temperatures and a timing on a longer series. The check runs hidden small cases with edge values, then large inputs built to defeat shortcuts, and compares results with a correct answer.
