# Cookies, and what they cannot prove

## What you will be able to do

Every request so far stood alone: the server answered it and forgot it. Signing in needs the opposite, a server that knows the next request comes from the same person. Cookies are how that works on the web, and getting them right matters for whoever signs in. By the end of this issue you will be able to:

- read the cookies a server sets, and send them back on the next request
- say which requests a browser sends a cookie with, and for how long
- write a cookie that a page's scripts cannot read and other sites cannot borrow
- say what a cookie can never prove on its own

## The request from Ffion

> **Ffion:** I sign in on the studio app to change tonight's playlist. It says "Signed in as Ffion", and the very next screen says "Sign in first." Every time. Gethin says the server remembers me with a cookie, and the app never gives it back.

Gethin has a worry too. The server also sets a cookie called `presenter`, so the screens can say hello by name, and Odette asked whether the server could simply read that to know who is asking. Gethin says no, and wants it done properly.

## Something to bring back

A bakery's website remembers what is in your basket. After you add a loaf, its answer carries:

```
HTTP/1.1 200 OK
set-cookie: basket=b-41c9; Path=/; Max-Age=86400; HttpOnly
set-cookie: theme=dark; Path=/
```

Each `set-cookie` line sets one **cookie**: a name and a value, `basket=b-41c9`, then **attributes** after semicolons. Attributes tell whoever keeps the cookie where and for how long to send it back. They are never sent back themselves. On the next request only the pairs return, in one `cookie` header, separated by a semicolon and a space:

```
GET /checkout HTTP/1.1
cookie: basket=b-41c9; theme=dark
```

A value may have `=` signs in it. Only the first `=` separates the name from the value.

A browser keeps cookies in its **cookie jar** and adds the header by itself. A page's script may not even set a `cookie` header. Node's `fetch` keeps nothing, so a script has to read the cookies and send them back itself. Read them one by one with `response.headers.getSetCookie()`, which gives a list with one text per line. `headers.get('set-cookie')` joins the lines with commas, and a date in an `Expires` attribute has a comma of its own.

## Where and for how long

A browser sends a cookie only with requests that match all of its rules:

- **Host.** With no `Domain` attribute, the cookie goes back only to the host that set it. `Domain=bakery.example` also sends it to hosts under that domain, like `shop.bakery.example`, but never to `newbakery.example`: a host is under a domain only when it ends with a dot and the domain. The port does not count.
- **Path.** `Path=/orders` sends it with `/orders` and paths under it, like `/orders/7`, but not with `/ordersheet`: after the cookie's path, the request's path must end or go on with a slash. With no `Path`, a browser uses the folder of the address that set the cookie.
- **Lifetime.** `Max-Age=86400` keeps it for that many **seconds**. `Expires` gives a date instead, and `Max-Age` wins when both are there. With neither, the cookie lasts until the browser closes. Once a cookie has expired, it is thrown away and never sent. `Max-Age=0` removes a cookie at once.
- **Secure.** A `Secure` cookie goes only over https.

## Keeping a cookie safe

Two more attributes protect the person who signed in:

- **HttpOnly** keeps the cookie out of reach of the page's own scripts. If a script that should not be there ever runs in the page, it cannot copy the cookie. The cookie still goes with every request it matches.
- **SameSite** decides what happens when a page on another site makes a request to yours. `Strict` never sends the cookie then. `Lax` leaves it off forms that other sites post and requests their pages make in the background, but still sends it when someone follows a link to your site. `None` sends it with everything.

A sign-in cookie wants all of them: `Secure`, `HttpOnly`, a `SameSite` value, a path and a lifetime, and no `Domain` unless other hosts truly need it.

## What a cookie cannot prove

A cookie comes from the person's browser, and a person can change any cookie in their own browser, or send any `cookie` header from a script like yours. So a cookie that says `presenter=Ffion` proves nothing about who is asking.

What a server can trust is an id it made up itself, long and random, and stored with what it means. After a sign-in, the server keeps `{ presenter: 'Ffion', expires: ... }` under a new session id and sets only the id as a cookie. On each request it looks the id up in its own sessions. An id it never made matches nothing, and the server checks the expiry itself, because the browser's copy of a cookie is not proof of anything.

## Your work in this issue

Open `src/cookies.js`. Task 1 is the studio app's side: sign in and bring the cookies back. Task 2 is the browser's side: choose the cookies a request carries. A real browser does this for you, and writing it is how you learn its rules. Tasks 3 and 4 are the server's side: write the sign-in cookie, and find who is signed in.

Run `node run.js` after each task. It first signs in the way the studio app does today, so you see the 401. Check uses a server of its own, with cookies, sessions and times of its own.
