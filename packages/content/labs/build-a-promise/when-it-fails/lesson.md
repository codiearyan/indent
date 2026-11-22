# When something fails

## What you will be able to do

Your chains carry values from step to step. In the real world steps fail: a file is missing, a count is too low, a callback has a bug. By the end of this issue you can:

- turn a throw inside a callback into a failed docket instead of a crash
- write `catch()`, and let a chain carry on after it
- send a failure down a chain to the first step that handles it

## The request from Idris

Idris runs the price list every night, and has had two bad nights in a row.

> **Idris:** On Monday the stock sheet had no line for napkins, and the price list stopped at two in the morning with a wall of red text. On Tuesday someone asked for 100 posters when we had 60 sheets, the quote threw, and the whole script died with it, card prices and all. I want every quote to end one of two ways: a price, or a sentence saying why not. And I want to write the "why not" once, at the end, not after every step.

Run `node src/price-list.js` and it stops at once, on `catch()`, which you write in task 2. Tuesday's crash, the poster's throw, is task 1; the check shows it before the script can.

## A throw belongs to its step

When a callback throws, where does the error go today? Up through your code, into whatever called `resolve`. That is a file read or a timer, which knows nothing about quotes and cannot do anything useful with the error, so the program crashes. If several callbacks were waiting on the same docket, the ones after the throw never run at all.

A throw inside a callback means that step failed, and the chain already has a place for each step's outcome: the docket from `then()`. So the place that runs a callback wraps the call in a `try`, and in the `catch` fails the next docket with exactly what was thrown. Nothing escapes; the next callback in the list still runs; whoever reads the next docket finds out what went wrong.

```js
coffee
  .then((beans) => {
    if (beans < 20) throw new Error('Not enough beans')
    return grind(beans)
  })
```

When the beans run short, the docket from that `then()` fails with that error. The program carries on.

## catch() is a then() with one callback

Handling a failure is the other half of `then(onFulfilled, onRejected)`. Writing `then(undefined, handler)` everywhere is clumsy, so promises have a shorter name for it, `catch(handler)`, and so will your docket. It does no work of its own; it is a `then()` with no `onFulfilled`.

What matters is what happens after the handler runs. A handler that deals with a failure has finished its step, like any other callback, so what it returns keeps the next docket and the chain carries on:

```js
coffee
  .then(brew)
  .catch(() => 'a glass of water')
  .then((drink) => console.log('serving', drink))
```

If brewing fails, the last step serves water. Today your `then()` throws away what `onRejected` returns. It should treat both callbacks the same: run the one that matches the state, and settle the next docket from its result, waiting for it if it is a docket.

## Skipping ahead

Idris wants the "why not" written once, at the end. That works only if a failure can pass through steps that have nothing to say about it. In the coffee chain, if `coffee` itself fails, `brew` must not run, and the failure has to reach `catch()`.

You already have half of this. When a `then()` has no `onFulfilled`, it passes the value on unchanged. A `then()` with no `onRejected` does the same for a failure: the next docket fails with the same reason. Step by step, the failure travels down the chain, past every `onFulfilled`, until it meets the first callback that takes it. A throw halfway down the chain starts the same trip from where it happened.

This is also why a chain should end in a `catch()`. In your docket, a failure that reaches the end of a chain with nobody to take it is lost quietly, and a quiet failure is how a price list prints half a list and says nothing was wrong.

## Your work in this issue

All three tasks are in `src/docket.js`: catch a throw inside a callback, write `catch()` and let what a handler returns carry the chain on, then pass a failure down a chain. Try your work with:

```sh
node src/price-list.js
```

When you are done, the script never crashes. Card gets a day, the posters say how many sheets are short, and the napkins say they are not on the list. The check never runs the price list. It builds chains of its own whose callbacks throw, and follows each failure to the step that takes it.
