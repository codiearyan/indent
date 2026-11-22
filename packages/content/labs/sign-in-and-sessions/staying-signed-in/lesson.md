# Staying signed in

## What you will be able to do

Sunniva can sign in now, and the API answers with who she is. Then her next request arrives and the API has no idea who sent it. HTTP keeps no memory between requests: each one stands alone. In this issue you give the API a memory of who signed in, and the browser a way to say so on every request. By the end you will be able to:

- explain what a session is, and why its token must be impossible to guess
- make a token from secure random bytes
- set a cookie that the page's scripts cannot read
- read a cookie back from a request and find who sent it

## The request from Ivo

Ivo is building the sign-in screen for the studio's staff.

> **Ivo:** My page signs Sunniva in, and the very next request forgets her. Can the API remember? And please keep it away from my page's scripts. I load a calendar widget from somewhere else, and if a bad script ever got onto the page, I don't want it walking off with someone's sign-in.

## A session: a ticket the server remembers

Think of a coat check. The ticket is worthless on its own; it matters because the desk keeps a list of which number belongs to which coat.

A session works the same way. After a sign-in works, the API makes a long random **token**, writes down in a session store "this token belongs to staff member 3", and hands the token to the browser. On every later request the browser shows the token, and the API looks it up.

Whoever holds a token is treated as that member, no password asked. So the token has to be impossible to guess, and must never reach a log.

## A token nobody can guess

`Math.random()` is made for games, not secrets: its numbers come from a formula, and with a few outputs the next ones can be worked out. The time, a counter or a staff id are worse, because anyone can guess them outright. A token needs bytes from the operating system's secure source, which `node:crypto` gives:

```js
import { randomBytes } from 'node:crypto'

randomBytes(6).toString('base64url') // 'q3Zr-9Ka', different every call
```

Thirty-two such bytes have more possible values than anyone could try in the age of the universe. `base64url` writes bytes with letters, digits, `-` and `_`, so the text fits in a cookie or a URL with nothing to escape. Plain `base64` uses `+`, `/` and `=`, which a cookie would have to encode. Hex works too, at 64 characters for 32 bytes.

## Cookies

A cookie is a small value the server asks the browser to keep. The server sends a `Set-Cookie` header, and from then on the browser sends the value back in a `Cookie` header with every request to that site, by itself. In Express, `res.cookie(name, value, options)` writes that header:

```js
res.cookie('theme', 'dark', { sameSite: 'lax' })
// Set-Cookie: theme=dark; Path=/; SameSite=Lax
```

The attributes after the value tell the browser how to treat it, and three of them matter for a session:

- **HttpOnly** (`httpOnly: true`): the page's scripts cannot read the cookie through `document.cookie`. A bad script can still make requests while the page is open, but it cannot carry the token away to use elsewhere. A token kept in `localStorage` has no such protection.
- **SameSite** (`sameSite: 'lax'`): the browser leaves the cookie off requests that another site starts in the background, such as a hidden form that posts to your API. Without it, some browsers would let any page Sunniva visits send a change as her.
- **Path**: which paths the cookie goes with. Express sets `/` unless told otherwise, which means every path of the API.

On a real server there is a fourth, **Secure**, which keeps the cookie off plain HTTP. Kilnworth turns it on when the API runs behind HTTPS.

## Reading a cookie back

Express has no `req.cookies` unless you add another package, and this repo adds none. The cookies are in one header, which `req.get('cookie')` returns, or `undefined` when there are none:

```
theme=dark; session=q3Zr-9Ka...; lang=cy
```

Pairs are split by `;` and a space, and each pair by its first `=`. To read the `theme` cookie, split the header at `;`, trim each piece, cut each at its first `=` and keep the value whose name is exactly `theme`. Exactly matters: a test such as "the header contains `theme=`" also matches a cookie named `oldtheme`.

Once the token is found, the rest is a lookup: the session store gives the session, the session a staff id, the staff store the member. Any step can come up empty, which simply means "not signed in".

## Your work in this issue

Start with `newToken` in `src/tokens.js`. Then make `POST /sign-in` in `src/routes/signIn.js` save a session and send its cookie. Last, write `readSession` in `src/middleware/readSession.js` and mount it in `src/app.js`. The session store in `src/sessionStore.js` and `GET /me` are written for you.

Run `node try.js` after each task. It sends the cookie back by hand, the way a browser would. When you are done, the sign-in prints a `set-cookie` line with `HttpOnly` and `SameSite=Lax`, and `GET /me` answers `401`, then Kofi, then `401`.
