# Promises from callbacks

## Your first week at Tidewell

Tidewell Ferries runs three small boats from Tidewell Quay to Gull Island and Heron Point. Odile owns the company and skippers the biggest boat. Bram runs the ticket office and the screens in it.

> **Bram:** Every screen here waits on something slow. The tide gauge, the timetable, the sea sensor. Half the code uses callbacks, half uses promises, and when something fails the board just goes blank. Can you start with the departure board?

By the end of this issue you can turn a callback function into a promise, chain small steps with `then`, and combine two services where the second needs an answer from the first.

## What a promise is

A promise is an object that stands for a value you do not have yet. It starts **pending** and settles once: either **fulfilled** with a value or **rejected** with an error. After that it never changes.

You do not wait for a promise. You register what should happen next with `then`, and JavaScript calls you back when it settles. Your code keeps running in the meantime.

## Making your own promise

Older code reports results through a callback, usually `callback(error)` on failure and `callback(null, value)` on success. `new Promise` lets you put a promise in front of that. Its body runs straight away and receives two functions, one to fulfil and one to reject:

```js
function delay(ms, value) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms)
  })
}

delay(500, 'boarding').then((word) => console.log(word))
```

Only the first call to `resolve` or `reject` counts. Calling either one more time does nothing, which is a quiet safety net when a callback fires twice.

## Chains of small steps

`then` returns a **new** promise. That promise resolves with whatever your callback returns, so you can split work into steps:

```js
delay(100, [4, 9, 2])
  .then((list) => list.filter((n) => n > 3))
  .then((list) => list.length)
  .then((count) => console.log(count)) // 2
```

If any step throws, or the first promise rejects, every following `then` is skipped and the chain rejects with that error. You only need to deal with an error once, at the end, and only if you have something useful to do with it. A function that returns the chain lets its caller decide.

## Returning a promise from then

Here is the part that trips people up. If a `then` callback returns a **promise**, the outer chain does not resolve with that promise object. It waits for it and takes on its result, value or error. That is how you run one async step after another:

```js
getUser(id).then((user) => getOrders(user.id))
```

Leave out the `return` (or use curly braces and forget it) and two things go wrong. The chain resolves with `undefined` before the second call has finished, and if the second call rejects, nobody hears about it. Node then prints an unhandled rejection warning, or stops the process.

## Why your functions take their services as parameters

Every function in this repo takes the slow thing it depends on as a parameter with a real default, like `read = readTideTable`. In the demo you get the real fake services with their delays. The check passes its own versions that answer instantly and record how they were called, so it can test failures and ordering without waiting.

## Try it

Run `node src/demo.js`. It asks the fake services for tide tables and a sailing report and prints what came back. Before you write anything, every line says `Not implemented`. Do the tasks in order and watch the departure board fill in. Try the heron lines too: they are there to show what a failure looks like when it is passed along properly.
