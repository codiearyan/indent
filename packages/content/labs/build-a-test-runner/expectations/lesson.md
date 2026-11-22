# Expectations that explain themselves

## What you will be able to do

Your runner works, and Sefton has been using it every day. Now the tests themselves need help. By the end of this issue you can:

- write `expect(value).toBe(...)` and know exactly what "the same" means
- compare objects and arrays by what they hold, with a function that calls itself
- check that a function throws, without your own check getting in the way
- write a failure message a person can act on

## The request from Sefton

> **Sefton:** Every test I write ends in the same three lines: work out the price, compare it, throw with a message. Half the time I forget the message and the runner just says "Error". And the printed quote is an object with three parts. Comparing it part by part takes me six lines. Can the tests say what they expect, and have the runner say what went wrong?

Look at the first issue's test file and you will see what he means. Every test carries its own `if` and its own `throw`. The idea of an expectation is to write those once.

## An expectation is a function that throws for you

`expect(value)` returns an object of methods. Each method compares the value it was given with the one you pass in, returns quietly when they match, and throws when they do not. It is a closure: the methods remember `value` from the call to `expect`.

```js
function check(weight) {
  return {
    isUnder(limit) {
      if (!(weight < limit)) throw new Error(`Expected under ${limit} but got ${weight}`)
    }
  }
}

check(18).isUnder(20) // quiet
check(23).isUnder(20) // throws
```

Nothing new is needed in the runner. A failed expectation is a throw, and the runner already turns a throw into a failed test.

## What "the same" means

JavaScript has more than one idea of equal. `==` turns both sides into the same type first, so `'5' == 5` is true. That is rarely what a test means. `===` does not convert, but it says `NaN === NaN` is false. `Object.is` is the strictest: it treats `NaN` as itself and otherwise behaves like `===`.

For objects, all three ask the same question: is this the very same object? Two objects built separately are never the same, even when every field matches:

```js
const a = { size: 'A6' }
const b = { size: 'A6' }
Object.is(a, b) // false
Object.is(a, a) // true
```

That is right for a check named "be". To compare what objects hold, you need a second check.

## Comparing what objects hold

Two objects hold equal values when they have the same keys and, under each key, values that are equal. Those values can be objects too, so the comparison has to call itself, one level at a time, until it reaches plain values. That is recursion, and here it is the natural shape: every level asks the same question.

Watch for the traps:

- **Key order.** `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` hold the same thing. Turning both into text with `JSON.stringify` and comparing the strings fails here, and it also turns `NaN` into `null`.
- **Keys that only one side has.** Looping over the keys of one object misses keys that only the other has. Reading a missing key also gives `undefined`, so `{ a: undefined }` can look like `{ b: undefined }`.
- **Arrays and `null`.** `typeof []` and `typeof null` are both `'object'`. An empty array is not an empty object, and `null` has no keys to read.

## A message a person can act on

The message is the first thing anyone reads when a test fails, so it should say what was expected and what came instead. Node's `inspect` from `node:util` writes any value the way the console shows it: strings keep their quotes, objects show their fields. `` `${value}` `` cannot tell `'5'` from `5`, and turns every object into `[object Object]`.

```js
import { inspect } from 'node:util'
inspect('A6') // "'A6'"
inspect({ size: 'A6', copies: 40 }) // "{ size: 'A6', copies: 40 }"
```

## Expecting a throw

Sometimes the right outcome is an error: a quote for a mug must be refused. The expectation then gets a function, calls it inside `try`, and fails when nothing is thrown. Careful where you throw that failure. Anything thrown inside the `try`, including your own error, lands in your own `catch`, and the check passes when it should not. Catch into a variable, and decide after the `try...catch` is over.

## Your work in this issue

All three tasks are in `src/expect.js`: `toBe`, then `toEqual`, then `toThrow`. `tests/quote.test.js` now uses them. Run:

```sh
node tests/quote.test.js
```

The bulk price test still fails, and now its message tells you both prices. The check never runs Sefton's tests: it calls your expectations on values of its own.
