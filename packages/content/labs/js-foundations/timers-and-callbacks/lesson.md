# Later, not now

## What you will be able to do

Every line you have written so far ran straight away, one after the other, and every function had its answer ready when it finished. The shop is now full of things that take a moment: the stock room's old computer counts slowly, the card machine thinks before it says yes, and the courier's tracker answers when it answers. Code that waits works differently, and this part of the repo is about it. By the end of this issue you will be able to:

- run a function later with `setTimeout`
- hand over a function to be called later, and not its answer
- say why an answer that comes later cannot be given back with `return`
- do one slow thing after another, and stop a timer before it runs

## The request from Theo

> **Theo:** I asked the stock room computer how many cedar candles we have, and the laptop printed undefined. Then, a moment later, the stock room counted 4. The answer was there, just too late. And while you are at it: I keep forgetting things, and Ines asks me to hold parcels for half an hour in case someone changes their mind.

All four tasks are in `src/later.js`. The stock room's computer is `askStockRoom`, in `src/shop.js`.

## The line after does not wait

`setTimeout` takes a function and a number of milliseconds. It starts a timer and comes back at once. When the time is up, it calls the function:

```js
console.log('Kettle on')
setTimeout(() => {
  console.log('Kettle boiled')
}, 2000)
console.log('Cups out')
```

This prints `Kettle on`, then `Cups out`, and two seconds later `Kettle boiled`. The line after `setTimeout` does not wait for the timer. The function you hand over waits, and the rest of the file carries on. The number is the least time to wait: the function runs once that time is up and nothing else is running.

## Handing over a function

You met callbacks in the issue on passing functions: a function you hand to another function, for it to call. `setTimeout` takes a callback. The mistake to look for is handing over the answer of a call instead:

```js
setTimeout(console.log('Kettle boiled'), 2000)
```

The round brackets run `console.log` right there, so the text prints at once. `setTimeout` then gets what `console.log` gives back, `undefined`, and stops with an error:

```
TypeError [ERR_INVALID_ARG_TYPE]: The "callback" argument must be of type function. Received undefined
```

`Received undefined` is the clue: it was handed an answer, not a function. Wrap the call in an arrow function, and the whole arrow waits.

## Why the answer cannot be given back

A function that starts a timer finishes before the timer runs. So `return` cannot hand back anything the timer makes:

```js
function boil() {
  let water = 'cold'
  setTimeout(() => {
    water = 'boiling'
  }, 2000)
  return water
}

console.log(boil()) // cold
```

The `return` ran long before the water changed. A slow machine has the same problem, which is why it does not try to give its answer back. You hand it a function, and it calls that function with the answer once it has one. Here is a scale at the post office that takes a moment to weigh:

```js
weigh('P-9', (grams) => {
  console.log(`P-9 weighs ${grams} grams`)
})
console.log('Put P-9 on the scale')
```

The second line prints first. Inside the arrow function, `grams` is there; outside it, it never is. A `return` inside that arrow goes back to `weigh`, which ignores it. So a function of yours that needs the weight cannot give it back either. It takes a function of its own from its caller, and calls it from inside, with the weight or whatever it made from it.

Waiting in a loop until the answer arrives does not work: `while (grams === undefined) {}` never ends. An answer is only handed over once the code that is running has finished, and that loop never finishes.

## One after another, and changing your mind

Two slow questions written on two lines both start at once. When the second needs the first answer, or must not start until the first is done, ask it from inside the function that gets the first answer:

```js
weigh('P-9', (first) => {
  weigh('P-10', (second) => {
    console.log(first + second)
  })
})
```

The inner function can still see `first`, because it is made inside the outer one. Each new step goes one level deeper, which gets hard to read quickly; the next issue has a better way.

`setTimeout` gives back the timer it started. Keep it in a variable, and `clearTimeout` with that timer stops it, so its function never runs:

```js
const alarm = setTimeout(() => console.log('Wake up'), 60000)
clearTimeout(alarm)
```

## Your work in this issue

Open `src/later.js`. Task 1 sets a reminder with a timer. Task 2 asks the stock room and passes the count on. Task 3 asks twice, one after the other. Task 4 holds a parcel and lets you change your mind. Run `node src/demo.js` after each task: every line starts with the milliseconds since the demo began, so you can see what waited. Check runs your code on a clock of its own, so it never really waits.
