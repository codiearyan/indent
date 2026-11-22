# Middleware and one place for errors

## What you will be able to do

Your router finds the handler and hands it the params, the query and the body. Some work belongs to no single handler, though: checking who is asking, noting every request, answering errors the same way everywhere. That is what middleware is for. By the end of this issue you can:

- run functions in order before the handler, each deciding whether the next one runs
- send every error, from anywhere in that chain, to one place that answers
- notice a step that left a request hanging, and say which one

## The request from Hesper

> **Hesper:** Three things, all from this week. Anyone can change an order's status if they know the address; only staff should. A customer was shown `TypeError: Cannot read properties of undefined` on the order page, which tells them nothing and tells strangers too much. And on Tuesday the order page just spun all afternoon, and nobody could say which part of the server had forgotten to answer.

Run `node src/try.js`. It sets up a staff check, a note of every request and an error handler, and stops on `use()`, which you write first.

## A chain of steps

Middleware is a function with the same `req` and `res` as a handler, and one more argument: `next`. Calling `next()` lets the request go on to the next step; not calling it, and answering instead, ends the request there. A staff check is the classic:

```js
(req, res, next) => {
  if (!isStaff(req)) return sendJson(res, 401, { error: 'Staff only.' })
  next()
}
```

Think of a print job passing stations on its way to the press: the proof is checked, then the ink, then it is printed. Any station can stop the job, and none knows what comes after it. A list of functions and a counter is not enough to build that, because each step decides whether the next one runs. So the next step starts from inside `next`: a function that runs step `i` hands step `i` a `next` that runs step `i + 1`, and the handler is simply the last step.

Make that function `async`, and return its promise from `next`. Then `next()` returns a promise that settles once everything after it has finished, and a middleware can work on both sides of the handler:

```js
async (req, res, next) => {
  const started = Date.now()
  await next()
  console.log(`${req.url} took ${Date.now() - started} ms`)
}
```

`handle` waits for the first step, and so for all of them.

## Errors go to one place

Without help, every handler would catch its own errors and answer them its own way. Instead, the router gives them one place: `onError(router, (error, req, res) => ...)`. An error can start in three ways:

- a middleware calls `next(error)`
- a middleware or handler throws
- an `async` one throws, which does not throw at the call at all: it returns a promise that rejects

`await` turns all of them into the same thing. Have `next(error)` give back a rejected promise, wait for every step, and one `try` around the whole chain in `handle` catches every error. Nothing after the error runs. A promise that rejects before anybody waits for it is reported by Node as unhandled, so when `next` makes one, give it a `.catch(() => {})` straight away; waiting for it later still sees the error.

When there is no error handler, or it throws as well, the router answers `500` itself. Say that something went wrong, and nothing more. An error's message is written for the people who keep the server, and it can name files, values and customers.

## Nobody answered

The worst answer is none: the client waits until it gives up. In a chain, that happens when a step finishes without answering and without calling `next`. Only the router sees it, because it knows when each step finished: when its function returned, or when the promise it returned settled.

So after each step, look at two things. Was `next` called? Has the response ended? Node's `res.writableEnded` is true once it has. If neither, answer `500` with an error that names the step, such as `middleware 2`, or for a handler its route, `GET /orders/:id`. That one line would have saved Hesper's Tuesday.

This gives handlers a rule: answer before you return, or return a promise that settles after you answer. And `next` should work once: a second call must not run the rest again.

## Your work in this issue

All three tasks are in `src/router.js`: `use` and the chain in `handle`, then `onError` and the `try` around the chain, then noticing a step that stopped. Try your work with:

```sh
node src/try.js
```

The check builds chains of its own, with steps that wait, throw, answer, or forget to.
