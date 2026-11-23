# Paths with parts that vary

## What you will be able to do

Your router keeps a table of routes and says a plain no to everything else. But every path in that table is fixed, and a shop has hundreds of orders. This issue teaches it the trick every router has: one route for many paths. By the end of it you can:

- write a pattern such as `/orders/:id` and match paths against it
- pull the values out of a path and hand them to the handler, decoded
- decide which route wins when two of them fit the same path

## The request from Sefton

Sefton reads the order server's log every morning, and today he brought it to you.

> **Sefton:** Customers look up their own order on the page, `/orders/1873`, and the old server takes the third piece of the address as the order number. So `/orders/1873/proof` shows the order too, as if it were the same page, and `/orders/today` only works because I put its `if` above the other one. I want one route for an order, one for its proof, and a server that does not care which one I wrote first.

Run `node src/try.js` and you will see both servers. Yours answers 404 to nearly everything for now, because none of these paths is in its table letter for letter.

## A pattern is a path with holes

A pattern marks the parts that vary with a colon. Take a calendar on a wall, with a page for every month:

```
/calendar/:year/:month      fits  /calendar/2026/11       year: '2026', month: '11'
                            not   /calendar/2026
                            not   /calendar/2026/11/30
```

The reliable way to match is to split both on the slash and compare the two lists place by place. `'/calendar/2026/11'.split('/')` is `['', 'calendar', '2026', '11']`. The lists must be just as long. A fixed part must be the same, capitals included. A part with a colon takes whatever sits in that place, and its name, without the colon, becomes the key of the value.

Two shortcuts break here. One is matching with "starts with", which lets `/calendar/2026/11/30` in. The other is a regular expression with `.+` for a hole: `.+` happily swallows slashes, so `11/30` becomes one month. A hole is one whole part. It is also never empty: `'/calendar/2026/'.split('/')` ends with `''`, and an empty part is not a month.

## Values arrive encoded

A path can only carry some characters, so the rest are written as `%` and two hex digits: a space is `%20`, a slash is `%2F`. A paper called `cotton white` arrives as `/papers/cotton%20white`.

`decodeURIComponent('cotton%20white')` gives back `'cotton white'`. The order matters: match first, on the path exactly as it came in, then decode each value on its own. Decode the whole path first and `A5%2FA6`, one value with a slash in it, turns into two parts and fits nothing.

Some paths are simply broken. `decodeURIComponent('18%7')` throws a `URIError`, because `%7` is half a code. That is the client's mistake, not the server's, and it deserves a `400 Bad Request`, said plainly, with no handler run. Without a `catch`, the throw would travel up and take the request down with it.

Handlers read the values as `req.params`. Make it an object even when a route has no holes, so a handler can always look at it without checking first.

## When two routes fit

A real table will have overlaps. On the wall calendar:

```
GET /calendar/:year/:month
GET /calendar/2026/holidays
```

Both fit `/calendar/2026/holidays`. Taking the first one in the list makes the answer depend on the order the routes were written in, which is the very thing Sefton is tired of. A rule that does not care about order: the route that says more about this path wins, and the plainest measure of that is its number of fixed parts. `/calendar/2026/holidays` has three, `/calendar/:year/:month` has one. When two routes have the same number, there is nothing to choose between them, so the one added first wins.

Only routes of the request's method take part. A `POST` never goes to a `GET` route, however good a fit it is, so filter by method before you choose.

## Your work in this issue

All three tasks are in `src/router.js`. First `matchPath`, which only matches and knows nothing about requests. Then `handle`, which uses it for every route and hands over `req.params`. Then the choice between routes that overlap. Try your work with:

```sh
node src/try.js
```

The check uses patterns and requests of its own, never the ones in `try.js`, and gives every case a fresh router.
