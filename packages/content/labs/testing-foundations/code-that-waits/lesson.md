# Tests that wait

## What you will be able to do

The order form now says no to bad orders and yes to good ones. Next it has to know what is in the shed. Wendell counts the shed every morning, and his tablet saves the counts to a file. Reading that file takes a moment, so the code that reads it does not answer at once: it answers later. Tests for that kind of code have to wait for the answer. By the end of this issue you will be able to:

- test a function that answers later, with `async` and `await`
- check an answer that comes later with `resolves`
- check an error that comes later with `rejects`
- read the failures you get when a test does not wait

## The request from Wendell

> **Wendell:** Last Thursday the form sold three large boxes, and the shed had no squash left. I packed them with an extra onion and said sorry at every door. Now the form asks the shed first, and Effie says that part was never tested. I count the shed every morning. Can you make sure the form reads my counts right?

The code is in `src/stock.js`, and Wendell's counts are in `shed.json`. `countOf` gives the count of one item, and `canPack` says whether the shed has enough of a list of items for a number of boxes.

## Code that answers later

Say the hen house had a log file of how many eggs each hen laid this week, and a function that reads it:

```js
export async function eggsFrom(hen) {
  const log = JSON.parse(await readFile(new URL('../henhouse.json', import.meta.url), 'utf8'))
  if (!(hen in log)) throw new Error(`No hen called ${hen}`)
  return log[hen]
}
```

The word `async` in front of `function` changes what the function gives back. Calling `eggsFrom('Hazel')` does not give you 6. It gives you a promise: an object that stands for an answer that will be ready later. Code that reads files, asks a server or talks to a database works this way, because the computer has to wait for something outside JavaScript.

So the test from the last issues fails:

```js
test('Hazel laid 6 eggs this week', () => {
  expect(eggsFrom('Hazel')).toBe(6)
})
```

```
 FAIL  src/hens.test.js > Hazel laid 6 eggs this week
AssertionError: expected Promise{…} to be 6 // Object.is equality

- Expected:
6

+ Received:
Promise {}
```

Received is `Promise {}`: the test compared the promise itself with 6, before the answer was there.

## Wait with await

Put `async` in front of the test's function, and `await` in front of the call:

```js
test('Hazel laid 6 eggs this week', async () => {
  expect(await eggsFrom('Hazel')).toBe(6)
})
```

`await` pauses the test until the promise has its answer, and then hands you that answer. `await` only works inside an `async` function, which is why the test needs `async` too. Vitest sees that the test is `async` and waits for it to finish before it says pass or fail.

## resolves and rejects

A promise ends in one of two ways. It resolves with an answer, or it rejects with an error. Vitest has a word for each, put between `expect` and the matcher:

```js
test('Hazel laid 6 eggs this week', async () => {
  await expect(eggsFrom('Hazel')).resolves.toBe(6)
})

test('there is no hen called Bramble', async () => {
  await expect(eggsFrom('Bramble')).rejects.toThrow('Bramble')
})
```

`resolves` waits for the answer and then runs the matcher on it. `rejects` waits for the error and then runs the matcher on that. After `rejects`, `toThrow` works as it did in the last issue: an error type or a piece of the message in the brackets.

The `await` in front of `expect` matters. Without it the test ends before the check is done, and Vitest stops you:

```
Error: Promise returned by `expect(actual).resolves.toBe(expected)` was not awaited.
```

## Why toThrow alone does not work here

In the last issue you handed `expect` a function: `expect(() => placeOrder(order)).toThrow()`. Try that with an `async` function and it fails, even though the hen is missing:

```
 FAIL  src/hens.test.js > there is no hen called Bramble
AssertionError: expected [Function] to throw an error
```

An `async` function never throws straight away. Even when the error comes on its first line, the function hands back a promise, and the error arrives later, as a rejection. So `toThrow` sees a function that finished without an error. Give `expect` the promise and use `rejects`.

## Your work in this issue

Open `src/stock.test.js`; the code is in `src/stock.js` and the counts are in `shed.json`. Leave `shed.json` as Wendell saved it, and work your expected answers out from it by hand. Each task has its own `describe` block. Run `npx vitest run src/stock.test.js` after each test, and press Check when they all pass.
