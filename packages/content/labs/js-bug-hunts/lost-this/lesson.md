# The method that forgot its fleet

## What you will be able to do

Cinderbay bought a barcode scanner for the dock, so staff can scan a boat out and back in instead of writing it on a whiteboard. By the end of this issue you will be able to:

- explain how JavaScript decides what `this` is in a function call
- reproduce a method that loses its object when it is passed as a callback
- fix a class so its methods work wherever they are called from
- write a test that catches the fix which only works at one call site

## The ticket

Dario messages you on the first morning with the scanner.

> **Dario:** Scanner beeps, then nothing. The free boat list on the board is blank too. The console says something about undefined. I am back on the whiteboard for today. CPC-23 when you can.

The console on the dock laptop:

```
TypeError: Cannot read properties of undefined (reading 'out')
    at checkOut (src/fleet.js:15:14)
    at Object.scan (src/dock.js:12:7)
TypeError: Cannot read properties of undefined (reading 'out')
    at isFree (src/fleet.js:24:18)
    at Array.filter (<anonymous>)
    at Fleet.freeBoats (src/fleet.js:28:25)
```

## The idea: `this` is set by the call, not by the definition

In a normal function or method, `this` is not fixed when you write the function. It is decided each time the function is called, by how it is called:

- `fleet.isFree(id)`: called through an object, so `this` is `fleet`.
- `isFree(id)`: a plain call, so `this` is `undefined`. Classes and ES modules always run in strict mode, so there is no fallback to a global object.
- `isFree.call(other, id)`: `this` is whatever you pass.

A method reference like `fleet.isFree` is just the function. The link to `fleet` is not part of it. Hand it to `filter`, a timer or an event handler, and that code calls it plainly, so `this` is `undefined` and the first `this.out` throws.

```js
const counter = { count: 0, add() { this.count += 1 } }
counter.add() // works, this is counter
const add = counter.add
add() // TypeError, this is undefined
```

Arrow functions are different. They have no `this` of their own and use the `this` of the place where they were created. That is what makes them useful here.

## How to reproduce it

Run the demo:

```
node src/demo.js
```

It opens the dock: one scan out, the free boat list, one scan in. All three fail. In `src/reproduce.js`, trigger both crashes on purpose, the one from `freeBoats()` and the one from the scanner, and return their messages. Two different callers, one cause: a method called without its object.

## How to fix it

There are three ways to tie a function to its object:

1. A wrapper at the call site: `filter((id) => this.isFree(id))`.
2. `bind`: `this.isFree.bind(this)` returns a new function with `this` fixed for good.
3. Arrow function class fields: `isFree = (id) => ...` creates one function per fleet, tied to it.

The first one is the plausible wrong fix in this ticket. Wrapping the call inside `freeBoats` makes the board work, so it looks done. But the scanner in `dock.js` still receives `fleet.checkOut` as a plain function, and every scan still throws. A wrapper fixes one call site. Binding or arrow fields fix the method itself, so every caller, including ones written next year, gets a method that knows its fleet.

Bind or create the functions per instance, in the constructor or as class fields. Binding once on the class prototype to a single fleet would make every fleet share one set of boats. The cost of per instance functions is a little memory per object, which is nothing for a fleet of boats.

## How to test it

Bugs like this hide from tests that only call `fleet.method()`, because that call form always sets `this`. Test the way the code is really used: call `freeBoats()`, and wire a real scanner from `dock.js` with `connectScanner`, then scan a boat out and in and check the free list after each scan. The scanner test is the one that catches the one call site fix.

Run `npx vitest run src/fleet.test.js`. The check runs your tests beside the original, a correct fix and the freeBoats only fix, and expects fail, pass, fail.
