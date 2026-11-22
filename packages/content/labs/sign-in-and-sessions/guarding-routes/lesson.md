# Who may do what

## What you will be able to do

Every request now carries its session, and `req.staff` says who sent it. Yet changes are still guarded by the one shared staff key, and the API treats everyone who signs in the same. In this issue you retire the key and decide, route by route, who may do what. By the end you will be able to:

- tell "who are you" apart from "what may you do", and answer 401 or 403 for each
- write a guard that needs a sign-in for changes and leaves reads open
- write a guard made from settings, that lets only some roles through
- choose where a guard goes: in front of a whole router, or a single route

## The request from Dilys

Dilys is back with a short list.

> **Dilys:** Now that everyone signs in, I want that key gone for good. Changes need someone signed in. Reading workshops stays open, that's what Ivo's sign-up page does all day. Only I remove a workshop: last term a class vanished the night before it ran, and nobody knew who did it. And I'd like to see who has an account.

## Who you are, and what you may do

Two questions hide in every guarded request. **Who are you?** is answered by the sign-in and the session. **What may you do?** is answered by rules about that person. The first is called authentication, the second authorization, and they fail in different ways.

- **401 Unauthorized**: the request did not say who sent it, or the session is not real. Signing in would help.
- **403 Forbidden**: the API knows exactly who is asking, and the answer is still no. Signing in again would change nothing.

Getting these right helps the page as much as it helps security. On a 401, Ivo's page can show the sign-in screen. On a 403 it should not, because Kofi is already signed in; it should tell him the action is not his to take.

The shared key could not tell these apart. A key says "someone who knows the key", never who. With sessions, every change comes from a named person with a role: `owner` for Dilys, `teacher` for Kofi, `desk` for Sunniva.

## A guard is a middleware

You wrote a guard in the Express project, `staffOnly`, and a guard here is the same kind of thing: a middleware that either answers, so the route never runs, or calls `next()`. The difference is what it looks at. `readSession` has already run for every request, so a guard only reads `req.staff`. It never parses a cookie or checks a password itself.

Some guards need settings, so a function takes the settings and returns the middleware. Here is one for a different rule, letting a route run only on some days:

```js
function onlyOn(...days) {
  return (req, res, next) => {
    const today = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]
    if (days.includes(today)) return next()
    res.status(503).json({ error: { code: 'closed', message: 'Not open today' } })
  }
}
```

`...days` is a rest parameter: it gathers every argument into an array, so `onlyOn('sat')` and `onlyOn('fri', 'sat')` both work.

## Where a guard goes

Express runs handlers in the order they were added, and a guard protects whatever comes after it on its path.

- `app.use('/workshops', guard, router)` guards every route in the router.
- `router.delete('/:id', guard, handler)` guards one route. A route takes as many handlers as you give it, in order.
- `app.use(guard)` with no path guards everything that follows, the sign-in route too, and nobody could ever sign in.

Order matters the other way too. A guard placed before `readSession` would find `req.staff` empty every time.

## Reads stay open

`GET` and `HEAD` only read, and the workshops are public: the sign-up page reads them for anyone who visits. So the workshops guard lets reads through and asks for a sign-in only for the methods that change something.

Not every read is public, though. A list of staff, with names and email addresses, is not for strangers or for every colleague. A route like that needs a guard that checks both questions even for a `GET`: is someone signed in, and are they allowed. And the list must still leave out every password hash, because a 403 today does not stop a mistake from showing it to the wrong person tomorrow.

## Your work in this issue

Start with `signedIn` in `src/middleware/signedIn.js` and put it in place of `staffOnly` in `src/app.js`. Then write `allow` in `src/middleware/allow.js` and put it in front of the `DELETE` route in `src/routes/workshops.js`. Last, write `staffRouter` in `src/routes/staff.js` and mount it behind its own guard.

Run `node try.js` after each task. It signs Kofi and Dilys in, then tries the old key, a change by Kofi, a delete by each of them and the staff list for each. When you are done the key gets `401`, Kofi's change `200`, his delete and his look at the staff list `403`, and Dilys gets `204` and the list.
