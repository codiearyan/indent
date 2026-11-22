# Tests that wait

## What you will be able to do

Until now every test was over the moment its function returned. Real code waits: for a file, a database, a server. By the end of this issue you can:

- run a test that returns a promise, and judge it by how the promise ends
- run tests strictly one after another
- stop waiting for a test that will never finish, and leave nothing running behind it

## The request from Sefton

Sefton has moved the paper count out of his head and into `data/paper.json`, and he wants tests for it. Reading a file takes a moment, so those tests are `async`.

> **Sefton:** My poster test says PASS, and then the whole thing crashes with the poster error anyway. And I wrote a test for the supplier's price feed, which can't work here because the workshop has no internet. It passes too. How can a test pass when it never got an answer?

Run `node tests/quote.test.js` and you will see both. Your runner calls each test function and, if nothing is thrown at once, writes down a pass. An `async` function never throws at once. It returns a promise straight away, and its outcome comes later, after your runner has already moved on.

## A promise is the outcome, later

Any `async` function returns a promise, even one that throws on its first line:

```js
async function brewTea() {
  throw new Error('No water')
}

const outcome = brewTea() // no error here, just a promise
outcome.catch((err) => console.log(err.message)) // 'No water', a moment later
```

To judge a test, a runner must wait for that promise. Inside an `async` function, `await` does exactly that, and when the promise rejects, `await` throws right there, inside your `try`. `await` on something that is not a promise just hands it back, so plain tests keep working with the same line.

Making `run()` wait makes `run()` itself async, so it returns a promise too. Everything that uses its results, like `main()`, has to wait for it in turn. Promises spread upward that way.

## One at a time

There are two ways to wait for a list of things. Start them all, then wait for all of them, or start one, wait for it, then start the next. The first is faster. For tests it causes trouble: two tests that read and write the same file or list at the same moment fail in ways that change from run to run, which is the worst kind of failure to chase.

```js
for (const order of orders) {
  await send(order) // the loop pauses here
}
```

An `await` inside a plain `for...of` pauses the loop itself, so the next item starts only after the last has finished. `forEach` does not wait for promises at all: it calls every callback at once and returns. `Promise.all` waits, but everything inside it started together.

## Waiting for something that never comes

The supplier test waits for a promise that never settles. You cannot cancel a promise from outside. What you can do is stop waiting for it, by waiting for two things at once and taking whichever ends first. `Promise.race` does this:

```js
const answer = fetchWeather()
const giveUp = new Promise((resolve, reject) => {
  setTimeout(() => reject(new Error('No weather today')), 1000)
})
const weather = await Promise.race([answer, giveUp])
```

If the weather comes first, you get it. If a second passes first, `await` throws the error.

There is a catch. Node keeps a program running for as long as a timer is still waiting. When the weather arrives after 10 milliseconds, that timer is still set for the rest of the second, and the program cannot end until it fires. With a limit of a minute, a quick test would hold the program open for a minute. `setTimeout` returns an id, and `clearTimeout(id)` cancels the timer. Cancel it once the race is over, whichever way it went; `finally` runs in both cases.

One limit you cannot fix: a test stuck in an endless loop that never awaits anything holds JavaScript's only thread, and no timer can fire until it lets go. Time limits catch tests that wait too long, not tests that never stop working.

## Your work in this issue

All three tasks change `src/runner.js`, which already works for plain tests: first wait for async tests (and let `main()` wait for `run()`), then make sure they run one at a time, then add the time limit as a third argument to `test()`. Run:

```sh
node tests/quote.test.js
```

When you are done, three tests fail with readable reasons: the bulk price, the poster paper (there really are not enough sheets), and the supplier, after half a second. The check never runs Sefton's tests. It gives your runner tests of its own that pass, fail, wait, or never finish.
