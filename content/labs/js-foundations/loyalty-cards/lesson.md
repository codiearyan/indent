# Functions that remember

## A card in every parcel

Theo loved the order report. Now Ines has an idea of her own.

> **Ines:** I want to put a stamp card in every parcel. Ten stamps and the next candle is free. Could the site keep track of the stamps? And while you are in there, the burn time guide page is slow, and last week one customer got the welcome email three times.

Three small jobs, one idea behind all of them: a function that remembers something between calls.

## Functions keep their surroundings

In JavaScript, a function can use the variables that were around when it was created, even after the outer function has returned. That pairing of a function with the variables it can see is called a **closure**.

```js
function createGreeter(name) {
  let times = 0
  return () => {
    times += 1
    return `Hello ${name}, visit ${times}`
  }
}

const greetInes = createGreeter('Ines')
greetInes() // 'Hello Ines, visit 1'
greetInes() // 'Hello Ines, visit 2'
```

`times` is not global and not a property anyone can poke at. Only the returned function can reach it. Each call to `createGreeter` runs the body again, so each greeter gets its own `times`. That is exactly what a stamp card needs: one private count per card.

## Returning an object of methods

When a closure needs more than one action, return an object whose methods share the same variables:

```js
function createTally() {
  let total = 0
  return {
    add(n) { total += n },
    total() { return total }
  }
}
```

Both methods see the same `total`. A second tally gets a second `total`.

## Caching with memoize

The burn time guide calls a slow function that works out how long a candle burns. The answer for `'cedar'` never changes, so computing it twice is waste. **Memoizing** means wrapping a function so it saves each answer by its argument and reuses it.

The saved answers live in a closure, and a `Map` is the right home. A plain object would turn the number `1` and the string `'1'` into the same key. There is a second trap: a saved answer might be `0` or `undefined`. If you check "is there a value?" by reading it, those look missing and get computed again. Ask the `Map` whether it **has** the key instead.

## Doing something only once

The repeated welcome email came from a button that customers clicked more than once. A `once` wrapper fixes this class of bug for good: the first call goes through, later calls return the first result and do nothing.

You need to remember two things: whether the call happened, and what it returned. Keep them in separate variables. Rest and spread let the wrapper pass any arguments through:

```js
const wrapper = (...args) => fn(...args)
```

## Try it

Run `node src/demo.js` in the terminal. It stamps a card five times, asks for a burn time three times and tries to send a welcome email twice. All three tasks are in `src/helpers.js`. Write them one at a time and watch the output change. The check uses its own functions too, including ones that return `0` and `undefined`.
