# Many things at once

## A status page for Odile

Odile wants one page she can glance at from the wheelhouse before the first sailing.

> **Odile:** Every route with its crossing time, which harbour radios are answering, and the forecast. But the forecast service sometimes just hangs. If it is not back in half a second, I would rather see nothing than wait.

By the end of this issue you can run many requests at the same time with `Promise.all`, keep going past failures with `Promise.allSettled`, and stop waiting with `Promise.race` and a timer.

## Start first, wait once

A loop with `await` inside waits for each item before it starts the next. For ten requests of 200 ms that is two seconds. The fix is to start them all, which takes no time, and then wait once:

```js
const pages = urls.map((url) => fetchPage(url))
const texts = await Promise.all(pages)
```

`map` calls `fetchPage` for every url straight away and hands you an array of promises. Nothing has been awaited yet, so all the requests are already in flight.

## Promise.all

`Promise.all(promises)` returns one promise. It resolves with an array of every value **in the order of the input array**, not the order they finished in. That order guarantee is what makes it easy to match results back to inputs.

It rejects as soon as any one promise rejects, with that error. The others keep running, since a promise cannot be stopped from outside, but their results are ignored. Use it when you need everything and one failure means the whole answer is useless.

## Promise.allSettled

Sometimes a failure is an answer. If the Heron Point radio is silent, the status page should say so and still show the others. `Promise.allSettled(promises)` waits for every promise and never rejects. It resolves with one object per input, in order:

```js
{ status: 'fulfilled', value: 42 }
{ status: 'rejected', reason: new Error('No answer') }
```

You then walk the results and decide what each one means.

## Promise.race and timeouts

`Promise.race(promises)` settles the same way as whichever promise settles first. On its own that is rarely useful. Paired with a promise that only rejects after a delay, it becomes a timeout: if the real work wins, you get its result; if the timer wins, you get a timeout error.

Two details matter. First, when the work wins, the timer is still scheduled. Clear it with `clearTimeout`, or a program that should exit sits waiting for a timer nobody cares about. Second, giving up does not stop the work. It may still fail later. `race` keeps a listener on every promise it was given, so that late failure is quietly handled instead of reported as unhandled.

## Faking the clock

Tests that really wait half a second are slow and flaky. So `withTimeout` takes its `setTimeout` and `clearTimeout` as a parameter that defaults to the real ones. The check hands it a fake clock that just writes down every timer and fires them when told. It can then ask exact questions: was one timer requested, for how long, and was it cleared?

## Try it

Run `node src/demo.js`. It loads three routes, then a list with a closed route, pings four harbour radios, and asks for the forecast twice: once with plenty of time and once with only 500 ms. Each line prints how long it took. When you are done, three routes should take about as long as the slowest one, and the second forecast should give up at 500 ms.
