# Retries and cancellation

## The harbour server is busy again

Before each sailing the crew downloads a passenger list from the harbour authority's server. It is shared by every boat on the coast and often says it is busy.

> **Odile:** When it says busy, try again, but do not hammer it. And when I cancel a sailing for weather, I want the download to stop. Last week the tablet kept retrying for a sailing I had already cancelled.

By the end of this chapter you can retry a failing call with exponential backoff, retry only the errors that are worth it, and cancel the whole thing with `AbortController` so that nothing runs after you said stop.

## Which errors deserve another try

Some failures go away on their own: a busy server, a dropped connection, a timeout. Others never will: a sailing that does not exist, a bad password. Retrying those only wastes time and hides the real problem.

The code that throws usually knows best, so let it mark the error. In this lab a temporary failure has `retryable: true`:

```js
const err = new Error('Server busy')
err.retryable = true
throw err
```

The retry loop then has three outcomes per attempt: success, a retryable failure, and a final one.

## Exponential backoff

If a hundred clients all retry instantly, a struggling server gets a hundred more requests the moment it fails. Backoff spaces the retries out, and doubling the wait each time backs off quickly: 100 ms, 200 ms, 400 ms. Always cap the number of attempts, so a server that never recovers produces a clear error instead of an endless loop. After the last attempt there is nothing left to wait for, so do not sleep.

## AbortController and AbortSignal

JavaScript cannot stop a promise from outside. Cancelling is cooperative: you hand the work a signal, and the work checks it. `new AbortController()` gives you a `controller.signal` to pass around and a `controller.abort(reason)` to call. A signal has three things you will use:

- `signal.aborted`, true once `abort` was called
- `signal.reason`, the reason given to `abort`, or an `AbortError` when none was given
- an `abort` event, for code that is in the middle of waiting

```js
const controller = new AbortController()
const page = fetchPage(url, { signal: controller.signal })
cancelButton.onclick = () => controller.abort()
```

`signal.throwIfAborted()` throws `signal.reason` if the signal is aborted and does nothing otherwise. It is a tidy one-line check.

## Nothing after the abort

A cancellable sleep listens for `abort`, clears its timer and rejects. When the timer wins instead, it should remove its listener, because one signal often outlives many sleeps and listeners would pile up.

A cancellable retry loop must look at the signal every time it gets control back: before each attempt, when an attempt fails, and after each wait. An attempt that was already running may still fail after the abort with a perfectly retryable error. That is not a reason to wait and try again. The user said stop.

## Faking time

Both functions take their timing as options with real defaults. `retry` takes a `sleep` function, and `sleep` takes `setTimeout` and `clearTimeout`. The check passes fakes that record each delay and finish when it says so, so it can test a 400 ms backoff, or an abort halfway through a wait, without waiting at all.

## Try it

Run `node src/demo.js`. It fetches a manifest the server is busy for twice, one for a sailing that does not exist, and one it cancels after 120 ms. Each call to the server prints a line. Once you are done, S1 succeeds on its third call, X9 fails on its first, and S2 stops with an `AbortError` with nothing printed after it.
