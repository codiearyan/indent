# A value that arrives later

## What you will be able to do

You write `await` and `.then()` every day, and they work. In this repo you find out why, by writing a small promise of your own in plain JavaScript, with nothing built in to lean on. By the end of this issue you can:

- make an object that stands for a value that is not here yet
- hand out two functions that settle it, now or much later
- make sure it settles once and only once, whatever happens

## The request from Hesper

Ashgrove Press is a letterpress shop with two old presses, run by Hesper. Sefton works the counter and writes the quotes; Idris keeps the books and runs the price list every night. Everything runs on one computer in the workshop, with Node and nothing else, and Hesper will not keep code on it that nobody at Ashgrove can explain.

> **Hesper:** Idris's price list waits for the paper count and for the press queue. Last night it printed half a list, said nothing was wrong, and nobody could tell me why. Idris says it is the waiting part, the promises, and that nobody really knows what `await` does. That is exactly the code I do not keep. Can you write us our own, small enough to read in one sitting?

So the shop gets a promise of its own, called a docket. In a print shop, a docket is the slip that goes with a job: it says the job is on its way, and when the job is done the result is written on it. Your `Docket` does the same for a value.

## A value that is not here yet

Reading `data/paper.json` takes a moment. Node does not stop and wait for it; it asks the disk, carries on with the rest of the script, and calls a function back when the file is read. A function that asks for the paper count cannot return the count, because the count is not here yet. It can return something that stands for it.

That something has three states. It starts **pending**. Later it is either **fulfilled**, kept with a value, or **rejected**, failed with a reason. Your docket shows both on the outside, as `state` and `value`, so you can watch it change. The built-in promise keeps them hidden, but it has exactly the same three.

## The executor and its two functions

Whoever makes a docket knows how to get the value; the docket only knows how to hold it. They meet in the executor, a function passed to the constructor:

```js
const tea = new Docket((resolve, reject) => {
  setTimeout(() => resolve('hot water'), 1000)
})
```

The constructor calls the executor at once and hands it two functions. The executor starts the work and keeps hold of them; a second later, the timer calls `resolve`, and only then does `tea` become fulfilled.

How can `resolve`, called from a timer after the constructor is long gone, still change `tea`? Because a function remembers the variables around the place it was written, for as long as it exists. That is a closure. An arrow function written inside the constructor also keeps that constructor's `this`, so when it runs, a second later, from anywhere, `this` is still the docket.

## Once and only once

A docket is about one outcome. Code is not always that tidy: a callback can fire twice. If the second call won, two parts of the program could read two different answers off the same docket.

So the first call to `resolve` or `reject` settles the docket, and every later call to either does nothing at all. It does not throw either: the code calling it, a timer or a file read, has no way to deal with that. The simplest way to keep the rule is to send both functions through one small function that refuses to do anything once the docket is no longer pending.

Notice what decides "settled": the state, never the value. A docket can be kept with `0`, an empty string or `undefined`, and it is settled all the same.

## When the executor throws

The executor is someone else's code, and code throws. Letting that through would crash the code that only wanted a docket. A throw is just another way to say "this failed", so the constructor catches it and fails the docket with exactly what was thrown, an `Error`, a string or even `undefined`.

One case is easy to miss. An executor can call `resolve` and then throw on its next line. The docket is already settled by then, and the once-only rule still applies. If the catch changes the state by itself, it breaks the rule you just wrote; going through the same small function keeps it.

## Your work in this issue

All three tasks are in `src/docket.js`, in the constructor: settle the docket, settle it only once, then catch a throwing executor. The check refuses the file if it uses the built-in `Promise`, `async` or `await`, in this issue and every one after: the point is to build it yourself. Try your work with:

```sh
node src/price-list.js
```

Look at the order of the lines. The card count is pending when it is asked for, the script carries on, and a moment later the docket is fulfilled. The posters keep their first count, and the smudged count fails without crashing anything. The check never runs the price list; it makes dockets of its own.
