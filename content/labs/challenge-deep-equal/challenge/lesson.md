# Deep equal

## The problem

`===` tells you whether two values are the same object, not whether they look the same. Test runners, caches and change detection all need the second question: do these two values have the same structure and contents? You write `deepEqual(a, b)` to answer it.

You build it in three steps: plain data first, then the built-in types whose contents hide from `Object.keys`, then values that contain themselves.

## Constraints

- Primitives follow `Object.is`: `NaN` equals `NaN`, and `0` differs from `-0`.
- Key order never matters, but key presence does: `{ a: undefined }` is not `{}`.
- Two values of different kinds are never equal, even when their keys match.
- The check calls `deepEqual(a, b)` and `deepEqual(b, a)` and expects the same answer.
- The last check walks 100,000 objects, so anything you remember must be cheap to look up.

## Worked examples

```js
deepEqual({ a: 1, b: [2, 3] }, { b: [2, 3], a: 1 })   // true
deepEqual([1, 2], { 0: 1, 1: 2, length: 2 })          // false: an array is not an object
deepEqual(new Set([1, 2]), new Set([2, 1]))           // true
deepEqual(new Map([['a', 1]]), { a: 1 })              // false
```

```js
const a = { name: 'node' }
a.self = a
const b = { name: 'node' }
b.self = b
deepEqual(a, b)   // true, without recursing forever
```

## Task 1: plain data

The shape is recursive: compare two values by comparing their parts with the same function. Settle the easy cases first (same value, not both objects), then make sure both sides are the same kind of thing, then compare contents. The traps are the ones in the constraints: `NaN`, `-0`, `null` and keys that hold `undefined`.

## Task 2: built-ins

A `Date`, a `Map` and a `Set` keep their contents outside their own keys. Treat them as plain objects and every two dates look equal. Each needs its own rule: dates by time, maps by key and deep value, sets by membership. Check the kind before anything else, or a `Map` and an empty object will slip through as equal.

## Task 3: cycles

Following `a.self` forever overflows the stack. The fix is to remember which comparisons are already in progress and treat a repeat as equal, since the first visit will report any real difference. What you remember matters: the same object may be shared in several places and meet a different partner in each. Remember pairs, and keep the lookup constant time.

## How it is checked

Run `node src/demo.js` to see a few comparisons. The check runs hidden pairs for each task, both ways round, including edge cases like `-0`, missing keys, mixed kinds, shared objects and long cycles. Task 3 also times a large structure.
