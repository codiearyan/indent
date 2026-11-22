# When code says no

## What you will be able to do

The delivery edges are covered, and the farm has a new order form on its website. Behind it, `placeOrder` checks every order before it reaches Wendell's packing list, and turns a bad one away by throwing an error. Those checks are rules like any other, and they need tests too. By the end of this issue you will be able to:

- test that code throws an error when it should
- check which kind of error it throws
- check what the error's message says
- test that good input does not throw

## The request from Effie

> **Effie:** Last week someone ordered a "huge" box and it went straight onto Wendell's list. Nobody knew what to pack. Then a change meant orders from Tarrow were turned away for two days, and we lost six customers. The order form has to say no to bad orders and yes to good ones. Can you test both?

The code is in `src/orders.js`. It has three rules: the size must be one the farm sells, eggs come in whole dozens and never fewer than none, and the village must be one the van goes to.

## Why calling the code directly does not work

Take a farm tour booking that refuses groups over 20:

```js
export function bookTour(people) {
  if (people < 1) throw new RangeError(`A tour needs at least one person, not ${people}`)
  if (people > 20) throw new Error(`Groups over 20 must call ahead, asked for ${people}`)
  return { people, price: people * 6 }
}
```

The obvious test is wrong:

```js
test('turns away a group of 25', () => {
  expect(bookTour(25)).toThrow()
})
```

JavaScript runs `bookTour(25)` first, to get the value to hand to `expect`. That call throws, the error flies straight out of the test, and `expect` never runs at all. The test fails with the very error you wanted to see:

```
 FAIL  src/tickets.test.js > turns away a group of 25
Error: Groups over 20 must call ahead, asked for 25
 ❯ bookTour src/tickets.js:3:26
```

## Hand expect a function instead

Wrap the call in a small function and give `expect` the function, not its result:

```js
test('turns away a group of 25', () => {
  expect(() => bookTour(25)).toThrow()
})
```

`() => bookTour(25)` is a function that has not run yet. `toThrow` runs it, catches the error, and passes if one was thrown. If the call finishes without an error, the test fails.

## Which error, and what it says

`toThrow()` with nothing in the brackets passes for any error at all, including one that comes from a typo deep in the code. Most of the time you want to be more precise.

Put an error type in the brackets to check the kind of error:

```js
expect(() => bookTour(0)).toThrow(RangeError)
```

`RangeError` is one of JavaScript's own error types, meant for a number outside the range a function accepts. Code that shows errors to people often picks its words by the kind of error, so the kind is part of the behaviour.

Put text in the brackets to check the message:

```js
expect(() => bookTour(25)).toThrow('25')
```

That passes when the message contains `25`. Check the part of the message that matters to the person who reads it, here how many people asked, rather than copying the whole sentence. A test that copies every word fails the day someone fixes a comma.

## Saying yes is a rule too

Code that refuses bad input can also refuse good input by mistake, as the Tarrow orders found out. So test the good case as well. You do not need anything special for it: if the code throws, the test stops and fails by itself. Call it and check what comes back:

```js
test('books a group of 4', () => {
  expect(bookTour(4)).toEqual({ people: 4, price: 24 })
})
```

`expect(() => bookTour(4)).not.toThrow()` also works, but it only says nothing went wrong. Comparing the result says the booking is right, too.

## Your work in this issue

Open `src/orders.test.js`; the code is in `src/orders.js`. Each task has its own `describe` block, named for the rule it tests. For each rule, make an order that is good in every way except the one you are testing, so that only that rule can be the reason for the error. Run `npx vitest run src/orders.test.js` after each test, and press Check when they all pass.
