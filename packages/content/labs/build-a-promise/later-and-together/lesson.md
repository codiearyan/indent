# Later, and all together

## What you will be able to do

Your docket now does nearly everything a promise does. Two things are left: one order every callback can count on, and waiting for several dockets at once. Then you can read what `await` does. By the end of this issue you can:

- make every callback run later, in a fixed order, never during your own code
- put work off until the current code has finished, with `queueMicrotask`
- wait for all of a list of dockets, or for the first of them

## The request from Idris

Idris made the paper count faster: the file is now read once a night and kept in memory, so the second time anyone asks, the docket is already kept.

> **Idris:** Since then the price list prints in a different order depending on what was asked before. Look at the two counts: same function, same lines, and the invite's answer jumps in between "asking" and "asked". Tomorrow someone will put a line under a `then()` that needs to run first, and it will work on Monday and break on Tuesday. And while you're in there: I want all three counts at once, and I want to stop waiting for the press queue if it doesn't answer in half a second.

Run `node src/price-list.js` and compare the card lines with the invite lines.

## Sometimes now, sometimes later

You saw this coming in the second issue. A `then()` on a pending docket runs its callback later; on a settled docket, it runs it now, in the middle of `then()`. So the order of your own lines depends on whether a file happened to be read already.

The cure is to have one order only: a callback never runs inside `then()`, `resolve()` or `reject()`. It always runs after the code that is running now has finished.

## The queue after the current code

JavaScript runs one piece of code at a time. When that piece finishes (a script, a timer callback, a file callback), Node looks at what is waiting. There are two kinds of waiting work. Timers, file reads and other events wait in a long line, one per turn. Microtasks wait in a short line that is emptied completely as soon as the current code finishes, before anything from the long line gets a turn.

`queueMicrotask(fn)` puts `fn` at the end of the short line:

```js
setTimeout(() => console.log('timer'), 0)
queueMicrotask(() => console.log('microtask'))
console.log('code')
// code, microtask, timer
```

That is the right place for a docket's callbacks: as soon as possible, but never during your code. A timer would also be "later", but it waits behind every timer and file read already in line, so a chain of ten steps would take ten turns of the long line. Microtasks run first in, first out, so a callback queued when its `then()` is called on a settled docket, or when `resolve()` settles a docket it was waiting on, runs in the order the `then()` calls were made. The executor is not a callback: it still runs at once, inside `new Docket`, so it can start the work.

## All together, or the first one

Asking for three paper counts at once means one wait instead of three in a row. `Docket.all(dockets)` returns a docket that is kept once every docket in the list is kept, with an array of their values. The answers arrive in any order, but the array follows the list, so the first value always belongs to the first docket. Count the answers yourself: when the last place of an array is filled first, its length is already full while the other places are empty. And when one docket fails, the whole answer is lost, so `all` fails at once with that reason. With an empty list, nothing will ever arrive to finish the count, so `all` has to keep its docket with an empty array by itself.

`Docket.race(dockets)` returns a docket that settles the way the first of them to settle does, kept or failed. Racing the press queue against a docket that fails after half a second is how the price list stops waiting for something that may never answer. Every docket in the list may try to settle the race, and your docket already ignores every attempt after the first.

## What await does

Here is the payoff. `await` works on anything with a `then()` method, including your docket:

```js
const sheets = await sheetsInStock('card')
```

When a function reaches `await`, it stops and returns. Later, as a microtask, the docket's `then()` is called with two callbacks: one that carries on with the rest of the function, handing it the value, and one that carries on by throwing the reason right there at the `await`. That is the whole trick. `async` and `await` are chains of `then()`, written one line under the other.

## Your work in this issue

All three tasks are in `src/docket.js`: make every callback run later with `queueMicrotask`, then write `Docket.all()` and `Docket.race()`. Try your work with:

```sh
node src/price-list.js
```

When you are done, both counts print "asking", "asked", then the answer, and the last lines give every paper at once and the first free day. The check never runs the price list; it uses dockets and callbacks of its own.
