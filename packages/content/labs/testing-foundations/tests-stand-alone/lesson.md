# Tests that stand alone

## What you will be able to do

Your tests now cover prices, packing, deliveries, the clock and the card company. This last part is about trusting them: a test you cannot trust is one you stop reading. It starts with tests that pass or fail depending on what ran before them. By the end of this issue you will be able to:

- run one test by itself, and read why it fails there
- give every test a fresh thing of its own in `beforeEach`
- spot state that lives in the code and lasts from one test to the next
- clean up in a hook, so a failing test leaves nothing behind

## The request from Wendell

> **Wendell:** Effie wanted to check one thing about the van, so she ran just one of Lorcan's van tests, and it went red. Run them all and they're green. Then she added a test for the day's log, and a different one went red. Nobody had touched the van code. Which one do I believe?

The code is in `src/van.js`. `loadBox` puts a box in a van unless it would take the van over `VAN_LIMIT_KG`, `vanWeight` adds up the boxes, and `deliver` takes a box out and writes it in the day's log, which `deliveryLog` gives back.

## A test that leans on another

Say the farm shop has a basket:

```js
export function createBasket() {
  return { items: [] }
}

export function addItem(basket, item) {
  basket.items.push(item)
}

export function itemCount(basket) {
  return basket.items.length
}
```

And these tests, which pass:

```js
const basket = createBasket()

describe('basket', () => {
  test('takes a jar of honey', () => {
    addItem(basket, 'honey')
    expect(itemCount(basket)).toBe(1)
  })

  test('takes a second item', () => {
    addItem(basket, 'jam')
    expect(itemCount(basket)).toBe(2)
  })
})
```

There is one basket for the whole file. The second test expects 2 only because the first test put the honey in. It leans on the first test, and nothing in it says so.

## One test at a time

`-t` runs only the tests whose name contains a piece of text:

```
npx vitest run src/basket.test.js -t "second"
```

```
 ↓ src/basket.test.js > basket > takes a jar of honey
 × src/basket.test.js > basket > takes a second item 3ms
   → expected 1 to be 2 // Object.is equality
```

The arrow pointing down means skipped. Alone, the basket holds only the jam, so the test fails though the code is right. A test that only passes after another one breaks as soon as someone runs it alone, moves it, or deletes the test above it. And a failure that comes and goes with the order tells you nothing about the code.

Check runs each of your tests alone, and the whole file in the opposite order. A test must pass all three ways.

## A fresh thing for every test

The cure is a new basket for every test. You met `beforeEach` with the fake clock: it runs before every test. It can make the thing the tests share, too:

```js
describe('basket', () => {
  let basket

  beforeEach(() => {
    basket = createBasket()
  })

  test('takes a second item', () => {
    addItem(basket, 'honey')
    addItem(basket, 'jam')
    expect(itemCount(basket)).toBe(2)
  })
})
```

`let basket` sits in the block, so every test in it can see the name, and `beforeEach` gives it a new basket before each one. Now the test puts in everything it counts. `beforeEach` can do more than make the basket: it can fill it, so every test starts with the same full basket.

`beforeAll` runs once, before the first test. Use it only for something no test changes. Data a test only reads, like a box object you pass in, is safe to share at the top of the file.

## State that lives in the code

Sometimes the shared thing is not in the test file at all. Say the shop's till keeps the day's sales in its module:

```js
const sales = []

export function sell(item) {
  sales.push(item)
}

export function salesToday() {
  return [...sales]
}

export function closeTill() {
  sales.length = 0
}
```

The test file is loaded once, and so is `till.js`. `sales` lasts from one test to the next, whatever your `beforeEach` makes:

```
AssertionError: expected [ 'honey', 'jam' ] to deeply equal [ 'jam' ]

- Expected
+ Received

  [
+   "honey",
    "jam",
  ]
```

The `+` line is a sale the test never made: an earlier test left it there. Empty it with the code's own `closeTill()` in a hook. As with the clock, a line at the end of a test is not enough: when an expect above it fails, the test stops and the clean-up never runs, so the next test starts with the mess. `afterEach` runs after every test, passed or failed, and `beforeEach` before every test, so either can do it.

Check watches the day's log in `van.js`, on the working code and on every wrong version. A test that reads lines another test wrote fails the task.

## Your work in this issue

Open `src/van.test.js`; the code is in `src/van.js`. Each task has its own `describe` block. Run `npx vitest run src/van.test.js` for the whole file, add `-t` and part of a name to run one test, and press Check when every test passes both ways.
