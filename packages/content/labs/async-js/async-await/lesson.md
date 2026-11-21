# async and await

## The board is back, now it is slow

The departure board works again. Bram has two new complaints.

> **Bram:** The morning dashboard takes over a second to load, and I am staring at it while a queue builds. And yesterday a customer's ticket email bounced, the booking screen froze, and seat 4B stayed locked until Odile restarted everything.

By the end of this issue you can rewrite a promise chain as an async function, tell needless waiting from necessary waiting, and use try, catch and finally so that no failure is lost and cleanup always happens.

## async functions are promise functions

Put `async` in front of a function and it always returns a promise. Inside it, `await` pauses that function until a promise settles. A fulfilled promise gives you its value. A rejected one throws its error right where the `await` is.

```js
async function boardingLine(gate) {
  const flight = await findFlight(gate)
  return `${flight.code} boards at ${flight.time}`
}
```

Nothing else stops while the function is paused. Other code keeps running, which is the whole point. A `return` resolves the promise and a `throw` rejects it, so a rejection you do not catch simply travels to the caller, just like in a `then` chain.

## Needless waiting

`await` makes code read top to bottom, which also makes it easy to wait for things one at a time when they do not depend on each other. Three independent calls of 400 ms awaited in a row take 1200 ms. Started together they take 400.

The trick is that **calling** an async function starts the work. **Awaiting** is a separate step. So you can start everything you can, then wait:

```js
const price = loadPrice(id)
const stock = loadStock(id)
const [p, s] = await Promise.all([price, stock])
```

Some waiting is real, though. If one call needs an answer from another, it has to wait for that answer, and only that answer. Draw the dependencies before you reorder anything.

## A rejection nobody hears

There is a trap in "start now, await later". If a started promise rejects before you reach its `await`, nobody is listening at that moment. Node reports an unhandled rejection and, by default, stops the process. `Promise.all` attaches a listener to every promise as soon as you hand them over, so an early failure is caught and turned into a rejection of the whole thing.

The same trap catches a call you never await at all. `sendReceipt(order)` with no `await` inside a `try` is not covered by its `catch`: the function moves on, and the failure turns up later with no one to handle it.

## try, catch and finally

`try` and `catch` work on awaited promises just as they work on thrown errors. `finally` runs after the `try`, whether it returned or threw, and then lets the result or the error carry on. That makes it the right place for cleanup such as releasing a lock:

```js
const lock = await takeLock(room)
try {
  return await bookRoom(room)
} finally {
  lock.release()
}
```

Catch only the failures you have a real answer for. A failed save must reach the caller. A failed courtesy email can become a flag in the result.

## Try it

Run `node src/demo.js`. Each line shows the result and how many milliseconds it took. The dashboard starts at about 1100 ms and should drop to about 700 once you remove the needless waiting. The three booking lines show what happens when everything works, when the email bounces and when the save fails. In every case the seat should be unlocked exactly once.
