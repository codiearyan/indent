# When it arrives, do this

## What you will be able to do

Your docket can hold a value that arrives later, but the only way to read it is to look, and looking at the right moment is guesswork. By the end of this issue you can:

- keep callbacks on a docket until its value is there
- run the right callback, once, the moment it settles
- answer a docket that already has its value
- give any number of readers their turn, in order

## The request from Idris

Idris tried the docket in the price list and came back with a complaint.

> **Idris:** The price list looks at the paper count again after a tenth of a second. On a slow night the count was not there yet, and the list said "pending" where a number should be. I could wait a whole second, but then most nights I just sit there. I don't want to guess when it will be ready. I want to say: when the count arrives, do this.

That is the one job of `then()`. Today the docket knows when it settles, and nobody else does. `then(onFulfilled, onRejected)` lets anyone hand the docket two callbacks: what to do with the value, and what to do with the reason it failed.

## Remember now, run later

Think of a kettle that has its own docket:

```js
const tea = new Docket((resolve) => setTimeout(() => resolve('hot water'), 1000))

tea.then((water) => console.log('pour', water))
console.log('get the cups out')
```

When `then()` runs, there is no hot water. All `then()` can do is remember the callback and return. A second later the timer calls `resolve`, and that is the only place in the program that knows the water is ready. So the callbacks have to travel from `then()` to that place.

The usual way is a list on the docket. `then()` adds to it; the function behind `resolve` and `reject` runs everything in it once the state and value are set, and then empties it. Each entry can be a small function that looks at the state and calls `onFulfilled(this.value)` or `onRejected(this.value)`, so the decision is made when the outcome is known, not before.

Your once-only rule from the last issue matters here. Only the first `resolve` gets past it, so only that one runs the waiting callbacks. A callback that ran twice would print a price twice, or worse, book a job twice.

## Already there

The other half of the story is a docket that settled before anyone asked. A docket can be read long after its value arrived: the posters in the price list are counted by hand, so their docket is kept inside its own executor, before `then()` is ever called.

Nothing will ever settle that docket again, so a callback put on its list would wait forever. `then()` has to look at the state itself. Pending means keep the callback for later; anything else means the outcome is already known, and the callback can be run now.

Run the price list once you have it working and look at where the posters line lands. It comes before "the rest of the script carries on", while the card lines come after. Same `then()`, two different orders, depending on whether the value happened to be there yet. Keep that in mind; the last issue of this repo comes back to it.

## Many readers, and callbacks that are not there

One docket can have many readers. The price list asks the card count twice: once to print it and once to work out how many jobs it covers. Each `then()` is its own reader, and none may be forgotten, so a new callback must never take the place of one already waiting. Add each to the end of the list and run the list from the start, and they run in the order the `then()` calls were made.

Readers do not always care about both outcomes. `then(print)` says nothing about failure, and `then(null, complain)` nothing about success. A missing callback is not a mistake; it means there is nothing to do for that outcome. The same goes for anything that is not a function, such as a string passed by accident. `typeof callback === 'function'` tells you whether a callback can be called, and when it cannot, the docket simply skips it.

## Your work in this issue

All three tasks are in `then()` in `src/docket.js`: keep callbacks on a pending docket and run them when it settles, then answer a docket that has already settled, then handle many callbacks and missing ones. `then()` does not return anything yet; the next issue changes that. Try your work with:

```sh
node src/price-list.js
```

When you are done, every count is printed, the napkins say why there are none, and no line says "pending". The check never runs the price list. It calls `then()` on dockets of its own and records which callback ran, how often and with what.
