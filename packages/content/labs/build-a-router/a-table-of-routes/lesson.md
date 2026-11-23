# A table of routes

## What you will be able to do

Every server you have used had a router: you wrote `get('/orders', ...)`, and requests for that address reached your function. In this repo you write that router yourself, in plain JavaScript, so you know what happens between a request arriving and your handler running. By the end of this issue you can:

- keep a table of routes, each a method, a path and a function
- find the one route for a request and call its function
- say plainly when there is no route, and when the path takes other methods

## The request from Hesper

Ashgrove Press is a letterpress shop with two old presses, run by Hesper. Sefton works the counter and writes the small scripts the shop runs on; Idris keeps the books. Customers place orders on a little order page, and the page talks to a server Sefton wrote on the workshop computer.

> **Hesper:** Sefton's order server is one long function, an `if` for every address, and every time he adds one, something else breaks. Last week a customer deleted nothing at all and was told it worked. I want the server to be a list we can read: this request goes to that function, and anything else gets a plain no. Can you write us that?

Open `src/old-server.js` and you will see the chain of `if`s. Run `node src/try.js` and the first lines show what it does today: `/orders/todays-list` gets today's orders, because it starts with `/orders/today`, and `DELETE /prices` answers with the prices, because the method is never looked at.

## A request is a method and a path

When a browser or a script asks a server for something, the request says two things first: what to do, the method, and what to do it to, the path.

```
GET /orders/today
DELETE /prices
```

A Node server hands your code each request as an object, `req`, with `req.method` (`'GET'`, `'POST'`, always in capitals) and `req.url` (`'/orders/today'`), and a response object, `res`, to answer on. The method matters as much as the path. `GET /orders` reads the orders and `POST /orders` adds one: same path, different job.

So a route is three things: a method, a path, and the function to call, the handler. A router is a table of them. Here is the same idea for something else, a table that says which drawer a kind of paper lives in:

```js
const drawers = [
  { size: 'A5', weight: 300, drawer: 3 },
  { size: 'A5', weight: 120, drawer: 4 },
  { size: 'A4', weight: 300, drawer: 7 }
]
const drawer = drawers.find((d) => d.size === 'A5' && d.weight === 120)
```

Both parts of the key are compared. Compare only the size and you would get drawer 3 for thin paper. That is exactly the old server's method bug.

Each part has to be exactly the same, too. `'/orders/1873'.startsWith('/orders')` is true, but it is another path. And `'/orders' === '/Orders'` is false, rightly: paths are compared letter for letter, capitals included. A shortcut such as `startsWith` or `toLowerCase` makes a router answer requests nobody wrote a route for.

## A table that refuses mistakes

Whoever adds routes will make typos, and the best time to find them is the moment they are made. A path without its leading slash can never match a request, and a handler that is not a function cannot be called. Throwing a `TypeError` right there points at the exact line.

Two routes for the same method and path are a mistake too. Only one of them could ever answer, and nobody would know which. Refuse the second one with an error.

Each router keeps its own table. If two routers shared one list, a route added to one would answer on the other, so keep the table inside the object `createRouter()` returns, not in a variable at the top of the file.

## Two ways to say no

Not every request has a route, and every request still deserves an answer. HTTP has two status codes for it, and they say different things:

- **404 Not Found**: nothing lives at this path, whatever the method.
- **405 Method Not Allowed**: something lives here, just not for this method. The answer carries an `allow` header with the methods that would work, such as `GET, POST`, so whoever asked knows what to try.

Headers go out before the body, so `allow` has to be set before the response ends. In Node, `res.setHeader()` after `res.end()` throws.

Say no in words, too. A body such as `{ "error": "There is no route for DELETE /stock." }` tells the person reading a log which request it was. `src/send.js` has `sendJson(res, status, value)`, which sets the status, the content type and the body in one call; use it for every answer.

## Your work in this issue

All three tasks are in `src/router.js`: first the table and the call in `handle`, then the 404, then the 405. Try your work with:

```sh
node src/try.js
```

It sends the same requests to the old server and to your router, so you can compare the answers line by line. The check never uses those routes. It makes routers of its own, a fresh one for every case, and sends them requests of its own.
