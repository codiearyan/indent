# The query string and the body

## What you will be able to do

Your router finds the right handler for any path. But a request carries more than a path: questions after a `?`, and sometimes a whole body of data. Every handler needs them, so the router reads them once, before the handler runs, and carefully, because they come from outside. By the end of this issue you can:

- turn a query string into an object, repeated keys and odd names included
- read a JSON body that arrives in pieces
- refuse broken input and bodies that are too large, plainly

## The request from Idris

Idris keeps the books, and every evening he lists what is still waiting to be printed.

> **Idris:** I ask the server for `/orders?status=waiting&item=card&item=poster` and the old one says it has never heard of it. And now that the order page sends new orders, Hesper wants to know what happens when someone sends rubbish. Yesterday somebody pasted a whole book into the notes field, and the server sat there reading it.

Two things are missing: reading what comes after the `?`, and reading the body. Run `node src/try.js` to see both.

## The query string

Everything after the first `?` is the query. It is not part of the path, so routes are matched on what comes before it. The query itself is pairs joined by `&`, each a key and a value joined by `=`. Take a search on a paper supplier's site:

```
/papers?weight=300&colour=cream&colour=white&note=A4+or+A5
```

A few rules make that text into an object:

- A value may hold its own `=`, as in `note=size=A5`, so split each pair at its first `=` only.
- In a query, `+` means a space, and `%`-codes are decoded as in a path.
- A key may come more than once. Keeping only the last `colour` loses `cream`, so a repeated key gives an array of every value, in order.
- Broken `%`-codes, such as `discount=50%`, are common in hand-typed addresses. A search word is just text, so keep it as written instead of refusing the request.

Then there are keys a plain object already has. `{}` inherits `constructor` and `toString`, so `'constructor' in query` is true before you have added anything, and code that asks "have I seen this key?" goes wrong. Worse, `query['__proto__'] = 'ink'` does not add a key at all: it tries to replace the object's prototype. `Object.create(null)` makes an object with no prototype, where every key is one you put there. The built-in `URLSearchParams` reads pairs correctly too; putting them into such an object is still your job.

## A body arrives in chunks

A `POST` can carry a body, and the `content-type` header says what it is: `application/json`, possibly with more after a `;`, such as `; charset=utf-8`.

On a Node server, `req` is a stream, and the body comes in chunks of bytes, as the network delivers them:

```js
const chunks = []
for await (const chunk of stream) chunks.push(chunk)
const text = Buffer.concat(chunks).toString('utf8')
```

Join the bytes first, then make text once. The letter `è` is two bytes in UTF-8, and a chunk can end between them. Turning each chunk into text on its own breaks the letter into two broken ones.

Then `JSON.parse(text)`. When the text is not valid JSON, it throws a `SyntaxError`. That is the client's mistake, so the answer is `400 Bad Request`, said plainly, and the handler never runs. An empty body is not broken, just absent: leave `req.body` undefined.

A stream can be read only once. That is one more reason to do it in the router: the handler gets `req.body`, ready. Read it only once a route is found, too; a request answered 404 or 405 never needs its body.

## Too large

A client decides how much it sends. A router that collects everything before measuring it will hold a whole book in memory, or wait for ever on a client that never stops.

So count as you read. Each chunk is a `Buffer`, and `chunk.length` is its size in bytes, which is what a limit is about; `'é'.length` is 1 but it is two bytes. The moment the count goes past the limit, answer `413 Content Too Large` and stop reading. Leaving a `for await` loop with `return` or `break` stops it.

The `content-length` header says how big the body will be. When it is already over the limit, answer 413 before reading a single byte. But a header is only a claim, so keep counting anyway.

## Your work in this issue

All three tasks are in `src/router.js`: `parseQuery` and the `?` in `handle`, then the JSON body, then the limit, which `createRouter` takes as an option. Try your work with:

```sh
node src/try.js
```

The last request in it has a body over the small limit `try.js` sets. The check sends queries and bodies of its own, some in many chunks and one from a client that keeps sending.
