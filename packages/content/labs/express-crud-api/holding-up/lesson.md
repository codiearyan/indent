# Routers, middleware and errors

## What you will be able to do

The workshops API now does everything Kilnworth asked for: list, read, create, replace, change and remove. It does it all from one long `createApp`, it lets anyone change anything, and when something breaks it shows its insides. In this last issue you make it hold up. By the end you will be able to:

- split routes into a router module and mount it on a path
- write a middleware of your own that decides whether a request goes on
- write one error handler so no route ever leaks a stack trace
- explain the order in which Express runs all of these

## The request from Ivo and Dilys

Two notes arrive on the same day. First Ivo:

> **Ivo:** I sent a half-written body by mistake and got back a whole page of HTML with file paths from your server in it. My page can't read that, and I don't think strangers should see it either.

Then Dilys:

> **Dilys:** Ivo mentioned that anyone who finds the address could delete a workshop. Only the studio's computers should be able to change things. Reading is fine for everyone.

That is a staff key for every change, and one place that turns any error into a calm JSON answer. First, though, `createApp` needs to be easier to work in.

## Routers

A router is a small piece of an app: routes and middleware of its own, with no server. You make one with `express.Router()`, give it routes, and mount it on a path.

```js
// routes/members.js
export function membersRouter(members) {
  const router = express.Router()
  router.get('/', (req, res) => res.json(members.list()))
  router.get('/:id', (req, res) => {
    /* ... */
  })
  return router
}

// app.js
app.use('/members', membersRouter(members))
```

Inside a router, paths are written from where it is mounted: `/` is `/members` and `/:id` is `/members/7`. The router does not know or care what that prefix is. When it needs it, for a `location` header for example, `req.baseUrl` holds it.

This is how an API grows without one file growing with it: a router per resource, each in its own module, and `app.js` reduced to a short list of what is mounted where.

## Middleware of your own

You have used `express.json()`, a middleware someone else wrote. Writing one is no different. It is a function of `(req, res, next)` that ends in one of two ways:

- it answers, and the request goes no further
- it calls `next()`, and Express runs the next handler in line

```js
function openOnWeekdays(req, res, next) {
  const day = new Date().getDay()
  if (day === 0 || day === 6) {
    return res.status(503).json({ error: { code: 'closed', message: 'Open Monday to Friday' } })
  }
  next()
}
```

A middleware can look at anything in the request. `req.method` is the method in capitals, such as `'GET'` or `'DELETE'`. `req.get('Accept-Language')` reads a header whatever case its name was written in. The same headers are in `req.headers`, but there every name is in lower case, so `req.headers['Accept-Language']` is always `undefined`.

A middleware that needs settings is usually made by a function that takes them and returns the middleware, like `express.json()` itself. `app.use(path, a, b)` runs `a` and then `b` on that path, so a guard can sit right in front of the router it protects.

A **401 Unauthorized** means the request did not prove who sent it. A key in a header is the simplest proof there is. In a real deployment the key comes from the environment and travels only over HTTPS; here `createApp` takes it as `staffKey`.

## One place for errors

When a route throws, Express 5 catches it, also from an `async` route, and skips ahead to the first **error handler**. An error handler is a middleware with four arguments:

```js
app.use((err, req, res, next) => {
  /* ... */
})
```

Express tells it apart from other middleware by that count, so all four must be there even when you do not use `next`. Without one, Express answers with its own HTML page, and outside production that page includes the error message and the stack trace: file paths, line numbers, sometimes data. Useful to you, and to anyone curious about your server.

A good error handler does three things. It recognises errors that are the client's fault and says so: `express.json()` passes on an error with `type` set to `'entity.parse.failed'` and `status` 400 when a body is not valid JSON. It logs everything else in full, for you. And it sends the client a plain 500 that says nothing about the inside.

An error can also arrive after a route has started to send its answer. Then it is too late for another one: `res.headersSent` is `true`, and the handler should pass the error on with `next(err)`, so Express can close the half-sent answer.

The order still matters. Routes and the 404 catch-all come first, the error handler last.

## Your work in this issue

Start in `src/routes/workshops.js`: move the six workshop routes there and mount the router in `src/app.js`. Then write `staffOnly` in `src/middleware/staffOnly.js` and put it in front of the router. Last, write `handleErrors` in `src/middleware/errors.js` and register it at the end of `createApp`.

Run `node try.js` after each task. It sends a read, a delete with no key, a change with the key, broken JSON and an unknown path. When you are done those answer 200, 401, 200, a JSON 400 and a JSON 404. The key `try.js` sends is the one `createApp` uses when it is given none.
