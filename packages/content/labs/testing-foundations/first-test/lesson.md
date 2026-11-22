# Your first test

## What you will be able to do

Thistlecombe Farm packs vegetable boxes for the villages around it every Friday. Its code was written by Lorcan, the owner's nephew, who has since moved away, and every change to it breaks something that a customer finds first. You are its new developer. You know JavaScript; in this issue you write your first tests. By the end of it you will be able to:

- write a test that runs a function and checks its answer
- run your tests in the terminal and read the result
- read a failing test and tell whether the test or the code is wrong
- tell a test that can catch a mistake from one that cannot

## The request from Bridget

Bridget runs the farm and sets the prices. She is not happy.

> **Bridget:** Last week Effie tidied up the price file, and for two days every small box was charged as a large one. Eleven customers paid eleven pounds too much. I don't want to hear about the next one from a customer. Can the laptop check the prices for us before anything goes out?

It can. That is what tests are for.

## What a test is

A test is a small piece of code that runs your real code with one example and compares its answer with the one you expected. You work out the expected answer yourself, from the rules, not from the code. If they match, the test passes; if not, it fails and tells you where.

Tests live in their own file, ending in `.test.js`. A test runner runs every test in it and reports. This repo uses Vitest, which is already installed for you.

## Your first test

Say the farm had a function that works out how far the van drives to make a drop and come back:

```js
// src/van.js
export function roundTrip(miles) {
  return miles * 2
}
```

A test for it looks like this:

```js
// src/van.test.js
import { describe, test, expect } from 'vitest'
import { roundTrip } from './van.js'

describe('roundTrip', () => {
  test('a 6 mile drop is a 12 mile round trip', () => {
    expect(roundTrip(6)).toBe(12)
  })
})
```

Read it from the inside out. `expect(roundTrip(6))` runs the code and holds its answer, and `.toBe(12)` compares it with the 12 you worked out. `test(name, function)` wraps that check and names it in words. `describe(name, function)` groups the tests for one function; in this issue the blocks are written for you. The `import` lines bring in the runner's helpers and the code under test.

## Running the tests

In the terminal, run:

```
npx vitest run src/van.test.js
```

Vitest prints one line per test. A tick means it passed:

```
 ✓ src/van.test.js > roundTrip > a 6 mile drop is a 12 mile round trip 1ms
 □ src/van.test.js > roundTrip > a drop of 0 miles

 Test Files  1 passed (1)
      Tests  1 passed | 1 todo (2)
```

The square is a `test.todo`: a placeholder with only a name. Replace each one in your file with a real test. In this repo, a test with no `expect` in it fails on purpose, because it checks nothing.

## Reading a failure

Change the 12 to 14 and run it again. Now the line starts with a cross, and further down Vitest explains:

```
 FAIL  src/van.test.js > roundTrip > a 6 mile drop is a 12 mile round trip
AssertionError: expected 12 to be 14 // Object.is equality

- Expected
+ Received

- 14
+ 12

 ❯ src/van.test.js:6:26
```

The `FAIL` line names the test, so you know which rule broke. **Expected** is what the test wrote down. **Received** is what the code really gave. The last line is the file, line and column of the failed check, and below it Vitest shows that line with a small arrow under it.

## The test or the code?

A failing test says the test and the code disagree, not which one is wrong. To decide, go back to the rule itself: the price list, or what Bridget said. If the code follows the rule, the test is out of date, so fix the test. If the test follows the rule, you caught a mistake in the code, so fix the code. Never change a test just to make it pass.

## A test must be able to fail

A test that passes whatever the code does is worse than no test, because it makes you feel safe. These never fail:

```js
expect(12).toBe(12)                      // never runs the code
expect(roundTrip(6)).toBe(roundTrip(6))  // compares the code with itself
```

Check judges your tests the same way. It runs them on the farm's working code, where they must pass. Then it runs them on copies of the code with one mistake slipped in, like last week's, where a test for that rule must fail. A test that never runs the code, or checks a different rule, does not fail there.

## Your work in this issue

Open `src/prices.test.js`; the code it tests is in `src/prices.js`. Run the tests first with `npx vitest run src/prices.test.js`. Two of Lorcan's tests already fail. Write the two new tests first, then read each failure and decide what is wrong. Run the tests after every change, and press Check when they all pass.
