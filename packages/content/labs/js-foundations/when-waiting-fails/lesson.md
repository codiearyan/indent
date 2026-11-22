# When waiting fails

## What you will be able to do

So far every machine answered. Real ones do not always: a card is declined, the tracker has no news, the machine is busy. A promise can fail, and a failure you do not handle stops the whole program, the way a thrown error does. By the end of this issue you will be able to:

- tell a failed promise when you see one
- catch a failure with `try` and `catch` around `await`, and with `catch` on a chain
- try again a set number of times, and pass the last failure on
- clean up whether the waiting worked or failed

## The request from Ines

> **Ines:** On Saturday a card was declined, and the laptop stopped with a page of red text in the middle of the queue. When the machine says it is busy, I have to start the whole sale again. And the screen stayed on all afternoon and ran the battery flat. Can it cope when things go wrong?

All four tasks are in `src/payments.js`. Each machine in `src/shop.js` says how it can fail.

## A promise can fail

A promise that fails is rejected, and it holds an error instead of a value. Print one and Node shows it:

```
Promise {
  <rejected> Error: Card declined
      at ...
}
```

An `async` function that throws gives back a rejected promise, and `await` on a rejected promise throws its error right there, as if the line had a `throw` in it. When nothing catches the error on its way, Node prints it and stops the program, even though the error started inside a machine, long after the line that asked.

## try and catch around await

You met `try` and `catch` when the catalogue's text was broken. They work the same way around `await`:

```js
async function borrowLine(title) {
  try {
    const loan = await lendBook(title)
    return `${title}: due back ${loan.due}`
  } catch (error) {
    return `${title}: not lent, ${error.message}`
  }
}
```

The error's words are in `error.message`. Putting the whole error in a template literal gives `Error: ` in front of them.

There is a trap. `try` only catches a failure that happens while the `try` is still running, and with promises that means one you `await` inside it:

```js
try {
  return lendBook(title)
} catch (error) {
  return 'not lent'
}
```

This `return` hands the promise on and leaves the `try` at once. When the promise fails a moment later, the `try` is long over, so the failure goes straight past the `catch` to the caller. The same happens to a promise you never `await` at all. Write `return await` inside a `try`.

## catch at the end of a chain

A chain has its own `catch`. It takes a function that is called with the error, and what that function gives back is used instead:

```js
findBook(title)
  .then((book) => book.shelf)
  .catch(() => 'not in the catalogue')
```

A `catch` at the end catches a failure in any step before it. When nothing fails, it is skipped. Order matters: a `catch` written before a `then` hands its answer on to that `then`, as if it had been the value all along.

## Trying again

Some failures are worth a second try. A loop with `try` and `catch` inside it tries until one works, and `return` ends the function as soon as one does:

```js
async function lendWithRetries(title, tries) {
  let lastError
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await lendBook(title)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}
```

Each try waits for the last, because of the `await`. When every try fails, `throw` passes the last error on. Leaving it out would swallow the failure: the caller's promise would be fulfilled with `undefined`, and the caller would think it all worked.

## Cleaning up either way

Some things must happen whether the waiting worked or not, like turning off a light you turned on. `finally` runs after the `try`, in both cases:

```js
async function readInTheDark(title) {
  lampOn()
  try {
    return await findBook(title)
  } finally {
    lampOff()
  }
}
```

With no `catch`, the failure is not caught: `lampOff` runs, then the failure goes on to the caller as before. A `catch` that turns it into a value would hide it.

## Your work in this issue

Open `src/payments.js`. Task 1 catches a declined card with `try` and `catch`. Task 2 catches a silent tracker at the end of a chain. Task 3 tries a busy machine again. Task 4 turns the screen off whatever happens. Run `node src/demo.js` after each task. Check hands your functions machines of its own that fail when it says so.
