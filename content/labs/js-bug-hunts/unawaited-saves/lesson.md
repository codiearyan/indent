# The sync that did not wait

## What you will be able to do

Every evening the till sends the day's bookings to Cinderbay's online booking system. The job prints "synced" and the laptop closes. By the end of this chapter you will be able to:

- explain why `forEach` with an async callback does not wait for anything
- explain where the errors from those callbacks go
- fix the loop with `for...of` or `Promise.all`
- write fast async tests with a fake store, and catch the `await forEach` fix

## The ticket

Rosa writes on a Monday morning.

> **Rosa:** Three people with Sunday bookings turned up and the online system had never heard of them. The sync log says it saved all of them. Also, the bookkeeper says the log never shows an error, ever, which she finds suspicious. CPC-31.

The log from Sunday evening:

```
2026-11-15T19:02:11Z sync start bookings=3
2026-11-15T19:02:11Z sync done saved=3
2026-11-15T19:02:11Z laptop going to sleep
```

The sync finished in the same second it started, for a store that takes a while per save.

## The idea: forEach does not know about promises

An `async` function always returns a promise, straight away. The work after its first `await` happens later.

`forEach` calls your callback once per item and ignores whatever the callback returns. With an async callback, it gets a promise back each time and throws it away. So `forEach` finishes as soon as every save has been started, not finished, and the function carries on to `return`. Nothing anywhere is waiting for the saves.

Errors take the same path. When a save fails, its promise rejects, but nobody holds that promise, so the caller's `try...catch` never sees it. The rejection surfaces later as an unhandled rejection, far from the code that caused it. Depending on how the process runs, that is a crash with a confusing stack, or a line in a log nobody reads.

```js
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const done = []
const items = [1, 2, 3]
items.forEach(async (n) => {
  await wait(10)
  done.push(n)
})
console.log(done) // [], the loop finished before any callback did
```

In an interview, the short answer is: `forEach` is synchronous and ignores return values, so it cannot wait for promises. Use a loop that can `await`, or collect the promises and await them together.

## How to reproduce it

Run the demo:

```
node src/demo.js
```

It runs the sync against a fake store that takes 10 ms per save, then against one that fails on `b102`. The count and the store disagree, and the failure is never caught. In `src/reproduce.js`, measure it: await the sync, read how many bookings the store holds right away, wait 100 ms and read it again. Zero, then three, is the proof.

## How to fix it

Two correct shapes:

1. A `for...of` loop with `await store.save(booking)` inside. Saves run one after another, and the first failure stops the loop and rejects the function.
2. `await Promise.all(bookings.map((booking) => store.save(booking)))`. Saves run at the same time, and the first failure rejects the whole call. `Promise.all` also handles the other promises, so nothing escapes.

Choose by what the store can take. One at a time is gentler; all at once is faster.

The obvious wrong fix is `await bookings.forEach(...)`. It reads like it waits, but `forEach` returns `undefined`, and awaiting `undefined` finishes immediately. Another one is `bookings.map(async ...)` without `Promise.all`: you now have the promises, but still nobody waits for them.

## How to test it

The store is injected, so tests use `createFakeStore` with a small `delayMs` and stay fast. Two tests guard this bug: await `syncBookings` and then read `store.saved()` at once, expecting every booking; and give the store a `failOn` id and expect the call to reject with that error. Read the store straight after the `await`. Sleeping in the test would give the broken version time to finish and hide the bug.

Run `npx vitest run src/sync.test.js`. The check runs your tests beside the original, a correct fix and the `await forEach` fix, and expects fail, pass, fail.
