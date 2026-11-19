# A server that answers

## What you will be able to do

Larchmere Kayaks rents single kayaks, doubles and paddleboards from a wooden shed on Lake Marrow. Bookings live on a whiteboard, and you are the developer hired to put them behind a small JSON API. By the end of this chapter you will be able to:

- start an HTTP server with nothing but `node:http`
- send JSON with the right status, content type and length
- pick a handler from the method and the path of a request
- answer 404 and 405 in a way a client can act on

## The first message

Ines Varga owns Larchmere. Her first note is short.

> **Ines:** Our nephew is building the booking page this summer. He needs two things from you first: a way to tell the API is up, and the list of boats. JSON, please. He says he will know what to do with it.

That is two routes: `GET /health` and `GET /boats`. Everything else should get a clear no.

## How a request reaches your code

`createServer` from `node:http` takes one function and calls it for every request with two objects. `req` describes what the client asked for: `req.method` is a string like `'GET'`, and `req.url` is everything after the host, query string included. `res` is the answer you build: a status, some headers and a body.

The app in this lab is created by `createApp()`, which returns a server that is not listening yet. That split matters. `server.js` listens on a fixed port for you to try with `curl`, while `try.js` and the checks start the same app on port `0`, which asks the system for any free port, so nothing ever clashes.

## A response is three parts

A client reads the status first, then the headers, then the body. For a JSON API two headers do most of the work:

- `content-type: application/json; charset=utf-8` says what the body is and how its text is encoded
- `content-length` says how many bytes to expect

Here is a plain-text response, written by hand:

```js
const text = 'Lake Marrow is open'
res.writeHead(200, {
  'content-type': 'text/plain; charset=utf-8',
  'content-length': Buffer.byteLength(text)
})
res.end(text)
```

Notice the length. A string's `.length` counts characters, but the wire carries bytes, and a letter like `ø` takes two. Send the wrong length and the client either waits for bytes that never come or cuts the body short. `Buffer.byteLength` measures what will actually be sent.

Your first task wraps this pattern in `sendJson(res, status, body)` so no route ever writes headers by hand.

## Routing is a lookup

A router answers one question: which function handles this method on this path? You do not need a library for that. An object keyed by path, then by method, is enough:

```js
const routes = {
  '/weather': { GET: (req, res) => {} }
}
```

Two details catch people. First, `req.url` for `/boats?available=true` includes `?available=true`, so match on the path alone; `new URL(req.url, 'http://localhost').pathname` strips the query for you. Second, the method is uppercase, exactly as the client sent it.

## Two kinds of no

When the lookup misses, how it missed tells the client what to do next.

- **404 Not Found**: nothing lives at this path. Fix the URL.
- **405 Method Not Allowed**: the path exists, but not for this method. The response carries an `allow` header, like `allow: GET`, so the client can see what would work.

Errors in this API always have the same shape, so the booking page can handle them in one place:

```json
{ "error": { "code": "not_found", "message": "Nothing lives at /canoes" } }
```

The `code` is for programs and never changes. The `message` is for people.

## Try it

Run `node try.js`. It starts your app on a free port, sends four requests and prints the status, content type and body of each, then stops the server. Before you write anything every answer is a 500 that says `Not implemented`. When you are done you should see your health check, the fleet, a 404 and a 405 with its `allow` header.

If you prefer `curl`, run `node server.js` in one tab and `curl -i http://localhost:3000/health` in another. The `-i` flag prints the status and headers too.
