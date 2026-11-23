# Being sent somewhere else

## What you will be able to do

Addresses change. A server moves a page and leaves a note at the old address that says where it went, and the program that asked goes on to the new one. Usually nobody notices. When it goes wrong, data is lost or a program goes round in circles. By the end of this issue you will be able to:

- read an answer that sends you to another address
- tell the five redirects apart: for good or for now, and whether a form's data survives
- look at a redirect without following it
- follow redirects yourself, and stop when they go round in circles

## The request from Gethin

> **Gethin:** I tidied up the cupboard server's addresses and left notes at the old ones. The website's song request form still posts to the old `/request-a-song`, which I send on to `/forms/request`, and since then not one request has arrived. And Odette's bookmark for the old schedule just spins until it gives up. I need to see where each old address really goes.

The old addresses answer with a status in the 300s and nothing else. Every program that asks follows them by itself, so nobody sees what happens on the way.

## An answer that sends you on

Here is what a library's server says after it moved its catalogue:

```
HTTP/1.1 301 Moved Permanently
location: /books
content-length: 0
```

A status from 300 to 399 with a `location` header is a **redirect**: what you asked for is at the address in `location`, so ask there instead. Like the `location` of a `201`, it may be a whole address or only part of one, and it is read against the address you asked for. A path with a slash, like `/books`, starts from the host. A path without one, like `books`, replaces the last part of the path, the way a link in a page does: from `/old/catalogue` it leads to `/old/books`. `new URL(location, address)` works out all of these.

## Five redirects

The statuses differ in two ways. Is the move for good, or only for now? And does a request that carried data, a `POST` with its body, arrive at the new address as it was sent?

- **301 Moved Permanently** and **308 Permanent Redirect**: for good. Update your links and bookmarks. Browsers may remember these and go straight to the new address next time.
- **302 Found** and **307 Temporary Redirect**: for now. Keep using the old address.
- **303 See Other**: go and read another page instead, always with a GET. A server sends it after a form, to point at a "thank you" page.

307 and 308 promise that the request is sent again exactly as it was, method and body. 301 and 302 were meant to as well, but browsers long ago began to turn a `POST` into a `GET` for them, without its body. `fetch` does the same today. That is where Gethin's song requests went: the form's `POST` came back as a `GET` with nothing in it.

## fetch follows by itself

`fetch` follows redirects without telling you. The answer you get is the one from the last address, and two properties say what happened on the way:

```js
const response = await fetch('https://library.example/catalogue')
response.url        // 'https://library.example/books', where the answer came from
response.redirected // true
```

It gives up after 20 redirects in a row and stops with `TypeError: fetch failed`, with `redirect count exceeded` in its cause. That is what an address that leads back to itself looks like: a **redirect loop**.

## Looking without following

To see a redirect itself, tell `fetch` not to follow it:

```js
const response = await fetch('https://library.example/catalogue', { redirect: 'manual' })
response.status                   // 301
response.headers.get('location')  // '/books'
```

In Node, `redirect: 'manual'` hands you the redirect answer as it came, so a program can decide what to do with each step. In a page in a browser it does not: the browser keeps the answer to itself and hands the page an empty one, with status 0 and no headers.

Following by hand is how a tool shows every step of the way. It needs the same care as asking again after a server error: a limit. Without one, a loop never ends.

## Your work in this issue

Open `src/redirects.js`. Task 1 says what kind of redirect a status is. Task 2 asks for an address without following it and says where it leads. Task 3 follows an address step by step and stops when there are too many steps. Task 3 can use your function from Task 2.

Run `node run.js` after each task. Before your functions, it sends a song request to the two old form addresses, so you see what happens to a `POST` behind each kind of redirect. Check uses a server of its own, with addresses and redirects of its own.
