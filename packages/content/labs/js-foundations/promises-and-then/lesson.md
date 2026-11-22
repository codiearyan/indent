# A value that arrives later

## What you will be able to do

In the last issue every slow thing took a function to call back, and each step after another went one level deeper. JavaScript has a better way to hold an answer that is not there yet: a promise. A function can give a promise back at once, and the caller says what to do with the answer when it comes. By the end of this issue you will be able to:

- tell what a promise looks like before and after its value arrives
- use the value of a promise with `then`
- make a promise of your own that settles, and wrap an old machine in one
- write a chain where each step feeds the next

## The request from Theo

> **Theo:** The courier has a new tracker, and the order book is on the laptop now. People email me with an order number, and I have to find the parcel, then look it up, then write back. Every step waits on the one before. And the stock room computer is still the old one that wants a function. Can it all work the same way?

All four tasks are in `src/promises.js`. The machines are in `src/shop.js`.

## A promise is a value that arrives later

The library's catalogue answers slowly, so `findBook` gives back a promise. Print it straight away and Node shows it is still waiting:

```js
const asked = findBook('Salt Roads')
console.log(asked) // Promise { <pending> }
```

Print the same promise once the catalogue has answered, and Node shows the value inside: `Promise { { title: 'Salt Roads', shelf: 'B4' } }`. A promise that has its value is fulfilled. Both are the same promise; only time passed.

You cannot read the value off the promise itself. `asked.title` is `undefined`, because a promise has no `title`. Put it in a template literal and you get `[object Promise]`. When you see either, a promise was used as if it were its value.

## then: what to do when it arrives

`then` takes a function. When the promise is fulfilled, `then` calls that function with the value:

```js
findBook('Salt Roads').then((book) => {
  console.log(`${book.title} is on shelf ${book.shelf}`)
})
```

`then` gives back a new promise, of whatever its function gives back. So a function of yours can give back the result of `then`, and its caller gets a promise of your answer:

```js
function shelfOf(title) {
  return findBook(title).then((book) => book.shelf)
}
```

Two `return`s matter here. The one in front of `findBook` hands the promise to the caller; without it, `shelfOf` gives back `undefined`. The function you hand `then` must give back its answer too: with braces after `=>` and no `return`, the new promise is fulfilled with `undefined`.

As with `setTimeout`, `then` wants a function. `then(describe(book))` runs `describe` right away, before there is any book.

## A promise of your own

`new Promise` makes a promise. You hand it a function, and it calls that function at once with `resolve`. Calling `resolve(value)` fulfils the promise with that value:

```js
function brewed(tea, ms) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`${tea} is ready`)
    }, ms)
  })
}
```

Once settled, a promise stays settled. If `resolve` is never called, the promise waits forever: nothing fails, its `then` never runs, and when Node has nothing else to do it simply ends.

The same shape turns an old machine that wants a function into one that gives a promise. Call the old machine inside, and call `resolve` from the function you hand it, once its answer is there.

## A chain where each step feeds the next

When the function you hand `then` gives back a promise, the next `then` waits for that promise and gets its value:

```js
findBook('Salt Roads')
  .then((book) => findShelf(book.shelf))
  .then((shelf) => `Salt Roads is on the ${shelf.floor} floor`)
```

Each step is one function, one level deep, however long the chain. The step with braces is where things go wrong:

```js
.then((book) => {
  findShelf(book.shelf)
})
.then((shelf) => shelf.floor)
```

The middle function starts `findShelf` but gives back nothing, so the next step runs at once with `undefined`, and stops:

```
TypeError: Cannot read properties of undefined (reading 'floor')
```

A promise made inside a step is waited for only when the step gives it back with `return`.

## Your work in this issue

Open `src/promises.js`. Task 1 reads the tracker's promise with `then`. Task 2 makes a promise that waits on a timer. Task 3 wraps the old stock room computer in a promise. Task 4 chains the order book and the tracker. Run `node src/demo.js` after each task: it prints what each function gives back right away, and the same promise again after the wait. Check hands your functions machines of its own and answers them itself.
