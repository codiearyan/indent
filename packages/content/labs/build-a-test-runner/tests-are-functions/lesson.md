# Tests are just functions

## What you will be able to do

You use a test runner every day: you write `test('...', () => { ... })`, run one command, and a list turns green or red. In this repo you write that runner yourself, in plain JavaScript, so nothing about it is magic any more. By the end of this issue you can:

- save functions in a list to call later
- call each one and tell a function that returned from one that threw
- keep exactly what was thrown, whatever it was

## The request from Hesper

Ashgrove Press is a letterpress shop with two old presses, run by Hesper. Sefton works the counter and writes the small scripts that price each job. They all run on one computer in the workshop, which has Node and nothing else: no network, and Hesper will not have code on it that nobody at Ashgrove can read.

> **Hesper:** Last month we quoted a wedding order of 500 invitations at a tenth of the price, because Sefton changed one line for posters. I want every price checked after every change. Sefton has written down what the right prices are. Can you make the computer check them?

Sefton's notes are already in `tests/quote.test.js`, written the way you would write tests anywhere. What is missing is the thing that runs them.

## A test is a function that throws when something is wrong

Strip a test down and it is a name and a function. The function does some work and checks the outcome. If the outcome is wrong, it throws. If nothing is wrong, it simply returns. That is the whole contract between a test and a runner:

```js
const checks = [
  { name: 'the kettle is off', fn: () => { if (kettleOn) throw new Error('still on') } },
  { name: 'the door is locked', fn: () => { if (!doorLocked) throw new Error('open') } }
]
```

Nothing has run yet. Functions are values in JavaScript, so you can put them in an array and call them later, as many times as you like. A runner's first job is just this: keep a list of names and functions, in the order they were written.

It is also the place to catch mistakes in the test file early. `test('totals')` with no function is a typo, and so is a test with an empty name. Throwing a `TypeError` the moment it happens points the writer at the exact line, instead of failing in a confusing way later.

## Calling a function that might throw

A thrown error travels up through every function call until something catches it. If nothing does, the program stops. A runner must never stop because one test failed, so it calls each function inside `try`:

```js
for (const check of checks) {
  try {
    check.fn()
    console.log('fine:', check.name)
  } catch (problem) {
    console.log('not fine:', check.name)
  }
}
```

Where the `try` sits matters. Around one call, a throw ends that one call and the loop carries on with the next. Around the whole loop, the first throw would jump straight out of the loop, and every check after it would never run.

Notice what decides pass or fail: whether the function threw. What it returned does not matter. A test function that returns `false` has still passed, because returning is how a test says "nothing went wrong".

## Anything can be thrown

`throw` is not limited to errors. `throw 'out of stock'`, `throw { code: 7 }`, `throw null` and even `throw undefined` are all legal, and code written in a hurry does all of them. A runner has to treat every one of them as a failure.

That rules out a tempting shortcut: catching the value and then asking "is there an error?" with `if (problem)`. An empty string, `0`, `null` and `undefined` are falsy, so a test that threw one of them would look like a test that passed. The only reliable signal is which branch you are in: if the `catch` ran, the test failed.

Keep the caught value exactly as it is, too. Its message is not enough, because a thrown string or object has no message at all. In the next issues your report will show the error to a person, and it can only do that if you kept it.

## Your work in this issue

All three tasks are in `src/runner.js`: first `test()`, then `run()`, then keeping the error in `run()`. Try your work with:

```sh
node tests/quote.test.js
```

The file adds Sefton's tests and prints what `run()` returns. When you are done, one test fails: the bulk price. That is not your runner's fault. It is a real bug in `src/quote.js`, and your runner just found it. Leave it there for now; it is the proof that failures show up. The check never reads Sefton's tests. It gives your runner tests of its own, some that pass and some that throw all kinds of values.
