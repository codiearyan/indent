# The order server on your router

## What you will be able to do

Your router matches patterns, reads queries and bodies, runs middleware and answers errors in one place. One thing is left before it can take over from Sefton's chain of `if`s: running on a real server. This issue does that, with one more idea every router has, groups. By the end of it you can:

- put a set of routes, and their own middleware, under a prefix
- run your router on a real Node server, on an address the system picks
- move a whole server onto it, and explain every line of how a request is answered

## The request from Hesper

> **Hesper:** It is time. On Saturday the order server moves to your router, and Sefton's old file goes in a drawer. The staff pages need their key, all of them, and only them. And I want to see it answer from a real address on the workshop computer before I believe it.

`src/old-server.js` still holds the chain. `src/app.js` is where its replacement goes, and `node src/try.js` starts it on a real address once your part is done.

## A group is a router under a prefix

The staff pages share a beginning, `/staff`, and a rule: no key, no entry. Writing `/staff` in front of every path, and the key check into every handler, is how the old server grew. A group says it once.

Picture a museum with a public site and an archive for its keepers:

```js
const archive = createRouter()
use(archive, keepersOnly)
addRoute(archive, 'GET', '/boxes', listBoxes)
addRoute(archive, 'GET', '/boxes/:shelf', oneShelf)
mount(site, '/archive', archive)
```

Now `GET /archive/boxes/7` reaches `oneShelf`, after the site's own middleware and then `keepersOnly`; `GET /boxes` reaches nothing, and `keepersOnly` never runs for a public page. The archive's routes are written as if the archive were the whole site; only `mount` knows where it lives.

The simplest way to build it is to let the router do what it already does. When a group is mounted, each of its routes becomes a route of the router with a longer path, `/archive/boxes/:shelf`, carrying the group's middleware with it. Matching, choosing between routes, 404, 405 and the error handler then work for group routes with no new code, and the prefix is matched part by part like any other path, so `/archives` is not under `/archive`. Keep a reference to the group's list of middleware rather than a copy, and mount a group once its routes are in it.

## A real server

Everything so far ran on objects shaped like the ones a Node server hands over. Node's own server hands over exactly those:

```js
import { createServer } from 'node:http'
const server = createServer((req, res) => { ... })
server.listen(0, '127.0.0.1', () => console.log(server.address().port))
```

Port `0` asks the system for any free port, which is how tests and the check start servers without colliding. `serve` should return the server without calling `listen`, so whoever starts it picks the address.

Two things are worth adding at this edge. If `handle` itself fails, with nothing answered yet, the client should still get a plain `500`, and the server should keep answering the next request. A `try` around `await handle(...)` in the listener does both; `res.headersSent` says whether an answer has started.

And `HEAD`. A `HEAD` request asks for the headers a `GET` would give, without the body; tools use it to check a page is there. A path with a `GET` route can answer it with that route, and Node drops the body by itself. A path with its own `HEAD` route uses that one.

## Moving the server

The move itself is the reward for the other four issues. Each branch of the old chain becomes one route, its handler two lines: read `req.params`, `req.query` or `req.body`, ask the shop, answer. Errors are thrown as a `ShopError` and answered once, by the error handler. The staff routes go in a group with the key check as its middleware.

The bugs of the old chain go away without a line written for them. `DELETE /prices` gets a 405 that says which methods the path takes. `/orders/todays-list` is just an order that does not exist. `/orders/1873/proof` matches no route. A query no longer hides the path.

## Your work in this issue

First `mount` and the group middleware in `handle`, then `serve` and `HEAD`, both in `src/router.js`. Then `createApp` in `src/app.js`, from the list in its comment. Try it with:

```sh
node src/try.js
```

The check starts servers of its own on ports the system picks, with orders of its own, and closes them when each case ends.
