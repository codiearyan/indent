# Read one, read many

## What you will be able to do

Your API now answers with every workshop at Copperleaf Pottery. A sign-up page needs more than one long list, though: a page per workshop, and a way to narrow the list down. By the end of this issue you will be able to:

- put a value in the path with a route parameter and read it with `req.params`
- read optional filters from the query string with `req.query`
- remember that both arrive as text, and turn them into numbers safely
- tell a missing thing (404) from a bad question (400)

## The request from Ivo

Ivo Pernell builds the sign-up page. He has the list working and sends two requests in one message.

> **Ivo:** Each workshop gets its own page now, so I need to fetch one by its id. And people keep asking for "something on a Thursday for under forty". Can the list take a day and a top price?

That is `GET /workshops/3` for one workshop, and `GET /workshops?day=thu&maxPriceCents=4000` for a shorter list.

## Route parameters

A path in a route can have named holes. Each one starts with a colon:

```js
app.get('/bakers/:name/loaves/:loaf', (req, res) => {
  res.json(req.params)
})
```

A request for `/bakers/ines/loaves/rye` matches, and `req.params` is `{ name: 'ines', loaf: 'rye' }`. One parameter fills one segment of the path, so `/bakers/ines` alone does not match this route.

Here is the part that catches people. Every value in `req.params` is a string, because a path is text. If your data uses numbers for ids, `'3'` and `3` are different keys, and a lookup with the string finds nothing. Convert first:

```js
const id = Number(req.params.loaf)
```

`Number('3')` is `3`. `Number('rye')` is `NaN`, which matches no id at all, so a lookup with it simply finds nothing.

## Missing is not broken

When the id is not in the store, the request was fine; the thing it names is not there. That is a 404, the same status your catch-all already sends, with the same error shape. A page can then show "this workshop no longer runs" instead of a blank screen.

Watch the order of your checks. Once you have sent the 404, the handler must stop. A common way is to `return` the response:

```js
if (!loaf) return res.status(404).json({ error: { code: 'not_found', message: 'No such loaf' } })
res.json(loaf)
```

Without the `return`, the code goes on and tries to answer a second time, and Express complains that the headers were already sent.

## The query string

Everything after `?` in a URL is the query string, a set of `key=value` pairs joined by `&`. Express splits it for you into `req.query`:

```js
// GET /loaves?flour=rye&maxGrams=800
req.query // { flour: 'rye', maxGrams: '800' }
```

Unlike a route parameter, a query value is optional. The route stays `/loaves`, and a filter that was not sent is simply `undefined`. That gives a natural rule: filter by a value only when it is there.

Query values are text too. A filter that is a number has to be converted, and a client can always send something that is not a number at all: `?maxGrams=heavy`. Do not guess what they meant. Answer 400 Bad Request with a code the page can act on, and say what was wrong in the message.

## 404 or 400

Both are the client's to fix, but they mean different things:

- **404 Not Found**: the question was fine, and the answer is "there is no such thing".
- **400 Bad Request**: the question itself does not make sense, so there is no answer to look for.

An empty list is neither. `?flour=spelt` on a day with no spelt is a good question whose answer is "none", so it gets a 200 with `[]`.

## Your work in this issue

All three tasks are in `src/app.js`. Add the route for one workshop and its 404 first. Then teach the list route to filter by `day`, and last, by `maxPriceCents` with its 400.

Run `node try.js` after each one. It sends six requests: one workshop, two that do not exist, two filtered lists and a price that is not a number. Before you start, all of them get either the whole list or the catch-all 404. When you are done, each answer should match its request.
