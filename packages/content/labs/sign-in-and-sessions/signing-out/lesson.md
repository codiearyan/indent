# Ending a session

## What you will be able to do

Staff sign in as themselves, their sessions travel in cookies scripts cannot read, and every route knows who may do what. One thing is missing: a session never ends. In this last issue you let people sign out, and you give every session an end of its own. By the end you will be able to:

- sign someone out so the token stops working everywhere, not only in the browser
- read the time through a clock the app is given, and work in milliseconds
- give a session an end on the server and a matching lifetime in the cookie
- refuse and clear away a session whose time is up

## The request from Kofi

Kofi teaches most of the studio's classes, and signs in on the shared laptop by the wheels.

> **Kofi:** Yesterday I signed in on the studio laptop between classes. This morning it was still signed in as me, after the whole evening class had been at that laptop. I want a sign-out that really signs me out. And if I forget to press it, a session shouldn't last for ever anyway.

## Signing out means forgetting

There are two copies of a session: the token in the browser's cookie and the record in the session store. Deleting only the cookie is the tempting shortcut, and it is not a sign-out. If the token was copied anywhere, from a shared laptop, a proxy log or a borrowed browser, it still works, because the server still remembers it.

So signing out starts on the server: remove the session from the store, and the token is worthless wherever it is. Then tidy up the browser. `res.clearCookie(name, options)` sends a `Set-Cookie` with the same name, an empty value and a date in 1970, and the browser drops the cookie:

```js
res.clearCookie('theme')
// Set-Cookie: theme=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
```

A browser only drops the cookie that matches by name and path, so clear it with the options it was set with.

Signing out when you are not signed in is not an error. A second tab, a double click or an expired session all lead there, and the right answer is still "you are signed out": a `204`, with nothing to say.

## Reading the time

`Date.now()` gives the time as a number of milliseconds since the start of 1970. Durations are milliseconds too, so eight hours is `8 * 60 * 60 * 1000`, and "has this moment passed" is a comparison of two numbers.

Code that reads `Date.now()` directly is hard to test: nobody wants a check that waits eight hours. So this app reads its clock through `now()`, a function `createApp` is given and hands to the code that needs it. On the server it is `Date.now`. The checks and `try.js` pass a clock of their own that they can move forward.

Here is the idea on a different thing, a hold on a place in a class that lapses after fifteen minutes:

```js
const HOLD_MS = 15 * 60 * 1000
const hold = { place: 4, until: now() + HOLD_MS }

if (now() >= hold.until) releasePlace(hold.place)
```

## Two clocks for one session

A session's end lives in two places, for two reasons.

The **server** saves when the session ends, `expiresAt`, as a time in milliseconds. This is the one that counts. Whatever the browser does, the server refuses a session whose time has come.

The **cookie** gets a lifetime too, so the browser drops it on its own and stops sending a token that would only be refused. `res.cookie()` takes it as a `maxAge` option in milliseconds, and Express writes it into the header as `Max-Age` in seconds:

```js
res.cookie('theme', 'dark', { maxAge: 60 * 1000 })
// Set-Cookie: theme=dark; Max-Age=60; Path=/; Expires=...
```

The cookie's lifetime is a request, not a rule. Anyone who copied the token can keep sending it after the browser has thrown it away, which is why the server has the last word.

## When the time is up

A session has ended from the moment the clock reaches `expiresAt`, not one millisecond later. When a request brings an ended session, treat it as no session at all: `req.staff` stays unset, the request goes on, and reads keep working. Remove the ended session from the store while you are there, or the store fills up with sessions nobody can use.

The end is set once, at sign-in. Moving it each time the session is used would let a busy session last for ever, which is what Kofi asked to avoid.

## Your work in this issue

Everything happens in two files you already know. Add `POST /sign-out` to `src/routes/signIn.js`, then give each new session its end in the same file's `POST /sign-in`. Last, make `readSession` in `src/middleware/readSession.js` refuse a session that has ended. `createApp` already passes `now` to both.

Run `node try.js` after each task. It signs Kofi in and out, then signs him in again and moves its clock seven hours, then one more. When you are done, the old cookie gets `401` after signing out, the sign-in sends `Max-Age=28800`, and `GET /me` works at seven hours and answers `401` at eight.
