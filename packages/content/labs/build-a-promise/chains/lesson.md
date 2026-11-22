# One step after another

## What you will be able to do

`then()` can now say what to do when a value arrives. Real questions take several steps that wait on each other, and that is where chains come in: the `.then().then()` you have written a hundred times. By the end of this issue you can:

- make `then()` give back a new docket for the next step
- pass what each step returns on to the step after it
- wait for a step that has to wait for something itself

## The request from Sefton

Sefton takes the questions at the counter, and the most common one is "can you do it, and when?"

> **Sefton:** Someone wants 300 invitations. I need the paper count, then the first free day in the press queue, then I can answer. Each step needs the one before. With your docket I end up writing a callback inside a callback inside a callback, and by the third I can't read my own quote. Can't I just write the steps one under the other?

You can, if every `then()` gives back something the next `then()` can be called on. Today it gives back nothing, which is why `node src/price-list.js` fails on its second `.then`.

## A new docket for every step

Here is a chain about something else, a pot of tea:

```js
boilWater()
  .then((water) => steep(water))
  .then((tea) => addMilk(tea))
  .then((cup) => console.log('ready:', cup))
```

Each step waits for the one before, so each `then()` must return a docket that stands for the outcome of its own step. It cannot return the docket it was called on: that one stands for the water, which is already decided, while the tea is not made yet. And two `then()` calls on the same docket are two different next steps, so each gets a docket of its own.

The new docket settles when its step has finished: when this docket is kept and `onFulfilled` has run. So the code that runs `onFulfilled` needs the new docket's `resolve` in reach. A neat way to get it is to make the new docket first, and do all of the old work inside its executor, which runs at once:

```js
return new Docket((resolve, reject) => {
  // keep or run the callback here, with resolve in reach
})
```

## What a callback returns flows on

A chain is a relay: each step hands what it made to the next. The docket from `then()` is kept with whatever the callback returned. In the tea chain, `steep` returns the tea, so the next step gets the tea.

Two cases look like exceptions and are not. A callback that returns nothing returns `undefined`, and that is a real result: the step has finished, so the next docket is kept, with `undefined`. And a `then()` with no `onFulfilled` at all, such as `then(null, complain)`, has nothing to change the value with, so the next docket is kept with the same value and passes it on unchanged.

## A step that waits

Some steps cannot answer at once. In Sefton's chain, the second step needs the press queue, which is another file to read, so `firstFreeDay()` returns a docket. If the next docket were kept with that docket as its value, the step after would get a docket instead of a day, and the waiting would just be passed down the line. Run the price list after the first two tasks and you will see exactly that: the press line prints a docket.

So when a callback returns a `Docket`, the docket from `then()` waits for it, and settles the same way: kept with its value, or failed with its reason. You already have a way to wait for a docket and act when it settles. `instanceof` tells you whether a value is a `Docket`.

This is what lets a chain stay flat. Without it, every step that waits would need its own nested `then()`. With it, a step only returns the docket it is waiting on, and the chain carries on underneath.

Failures in the middle of a chain are the next issue. For now, when this docket fails, `onRejected` runs as before, and the docket from `then()` simply waits.

## Your work in this issue

All three tasks change `then()` in `src/docket.js`: return a new docket, keep it with what the callback returned, then wait for a returned docket. Try your work with:

```sh
node src/price-list.js
```

When you are done, the answer comes after the rest of the script, in three lines: the paper, the first free day by name, and Sefton's answer. The check never runs the price list. It builds chains of its own and reads what each step got.
