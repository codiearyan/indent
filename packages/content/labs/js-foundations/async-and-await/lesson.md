# Top to bottom with await

## What you will be able to do

A chain of `then` works, but every step is a function inside a function, and a decision halfway along is hard to fit in. JavaScript lets you write the same waiting as plain lines, read from top to bottom, with two words: `async` and `await`. By the end of this issue you will be able to:

- wait for a promise with `await` inside an `async` function
- say what an `async` function really gives back
- spot a forgotten `await` from what it leaves behind
- wait, decide, and wait again, one step after another

## The request from Ines

> **Ines:** On Saturday I take the stall to the market with the card machine. When someone pays, I want the laptop to wait for the machine, then take the candles off the stock, and tell me how many are left. Theo's chains of then work, but I cannot follow them. And if we run low, it should order more by itself.

All four tasks are in `src/checkout.js`. The card machine, the stock room and the supplier are in `src/shop.js`, and each gives back a promise.

## await waits for a promise

Put `async` in front of a function, and inside it you may put `await` in front of a promise. `await` pauses that function until the promise is fulfilled, and gives you its value:

```js
async function shelfOf(title) {
  const book = await findBook(title)
  return book.shelf
}
```

This does what `findBook(title).then((book) => book.shelf)` does, written as two ordinary lines. Only this function pauses. The code that called it carries on, exactly as the line after a `then` did.

`await` works only inside an `async` function, or at the top level of a module file. Anywhere else Node cannot read the file at all, and points at the `await`:

```
SyntaxError: Unexpected reserved word
```

When you see that, look for the function around the `await`: it needs `async` in front.

## What an async function gives back

An `async` function always gives back a promise, at once, whatever it returns. The value after `return` is what that promise is fulfilled with:

```js
async function shelfOf(title) {
  return 'B4'
}

console.log(shelfOf('Salt Roads')) // Promise { 'B4' }
```

Even with the answer ready, the caller gets a promise, and uses `await` or `then` to read it. That is useful: a function that sometimes has to wait and sometimes does not can still always give back a promise, so its caller never has to guess. The functions you write with `async` are promises to their callers too, so you `await` them like any machine of the shop.

## Forgetting await

Leave out `await` and nothing stops. You simply get the promise in place of its value, and it shows up later as something odd:

```js
const book = findBook('Salt Roads')
book.shelf // undefined
`${book}` // '[object Promise]'
book.copies - 1 // NaN
book >= 2 // false
```

A promise has no `shelf`, turns into `[object Promise]` in text, gives `NaN` in a sum, and is never greater than a number. Inside a list you see it as it is: `[ Promise { <pending> }, 'two' ]`. When one of these turns up, follow the value back to the call it came from, and put `await` in front of that call.

## Wait, decide, wait again

After an `await` you have a plain value, so everything you know works on it: `if`, sums, template literals. Each `await` waits for the one before, so lines run one after another:

```js
async function borrow(title) {
  const book = await findBook(title)
  if (book.copies === 0) {
    return `${title}: all out`
  }
  const loan = await lendBook(book)
  return `${title}: due back ${loan.due}`
}
```

`lendBook` only starts once `findBook` has answered, and only when there is a copy. A `return` inside the `if` ends the function there, as in any function.

## Your work in this issue

Open `src/checkout.js`. Task 1 waits for the card machine. Task 2 gives back a promise of a count, whether it has to ask or not. Task 3 counts, decides, and orders. Task 4 closes a sale with your function from Task 1. Run `node src/demo.js` after each task: it prints what each function gives back right away and what `await` gets from it. Check hands your functions machines of its own and answers them itself.
