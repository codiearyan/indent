# Binary search bounds

## The problem

A leaderboard keeps scores in a sorted array. Questions like "how many players scored exactly 20" or "where does a new score of 25 go" are binary searches, but the plain search that stops at any match is not enough. With duplicates you need the edges of a run, and those edges are where off-by-one bugs live.

You write two bound functions, build a count and an insert position on top of them, then search an array that was sorted and then rotated.

## Constraints

- Every search takes an optional `compare(a, b)` that returns a negative number, zero or a positive number. Without one, `natural` from `src/compare.ts` orders numbers and strings.
- Every answer must use O(log n) comparisons. The check passes a counting `compare` on a million objects and sets a generous budget per search.
- The large arrays hold objects, so `===`, `indexOf` and `includes` cannot find a value. Only `compare` can.
- Use TypeScript that Node can run directly, with explicit `.ts` import extensions.

## Worked examples

Bounds and counts on duplicates:

```ts
const scores = [10, 20, 20, 20, 30, 40]
lowerBound(scores, 20)        // 1: the first 20
upperBound(scores, 20)        // 4: the first item after the 20s
countOccurrences(scores, 20)  // 3
insertPosition(scores, 25)    // 4
lowerBound(scores, 99)        // 6: nothing qualifies, so items.length
```

A rotated array:

```ts
const rotated = [40, 50, 10, 20, 30]  // [10, 20, 30, 40, 50] rotated by 3
searchRotated(rotated, 20)            // 3
searchRotated(rotated, 35)            // -1
```

## Task 1: lower and upper bound

Think of the array as two zones: items that do not yet qualify, then items that do. A bound is the index where the second zone starts. That view removes the guesswork: you are never looking for a match, only for a boundary, and the boundary can be at `0` or at `items.length`.

Here is a different search in the same shape, the smallest whole number whose square reaches `n`:

```ts
function ceilSqrt(n: number): number {
  let low = 0
  let high = n
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (mid * mid >= n) high = mid
    else low = mid + 1
  }
  return low
}
```

## Task 2: count and insert position

Both answers fall out of the bounds. The trap is a loop that finds the first match and then walks forward through the duplicates. It looks fast on small arrays, but when half a million items are equal it makes half a million comparisons.

## Task 3: a rotated array

Split the range at the middle. At least one half is in order, and comparing the first item of the range with the middle item tells you whether it is the left one. If the target falls inside the sorted half, search there. Otherwise, search the other half. Every step still halves the range.

## How it is checked

Run `node src/demo.ts` to see each function on a small array. The check runs hidden cases with duplicates, missing values, both ends of the array, tiny and empty arrays and a custom order, then counts comparisons on a million items. Each file is type-checked.
