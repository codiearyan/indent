# Pages from more than one place

## What you will be able to do

Every program in this repo so far asked the cupboard server directly, and read whatever came back. A script in a web page does not get to. The browser it runs in decides whose answers it may read, to protect the person using it. This last issue of the repo is about that rule. By the end of it you will be able to:

- say what an origin is, and when two addresses share one
- say when a browser lets a page read an answer from another origin
- let the right pages read your server's answers, and only those
- answer the request a browser sends first, before some requests

## The request from Odette

> **Odette:** The village hall wants a "Now playing" box on its website. Their volunteer wrote it, and says the browser blocks it with an error about another origin. And our own new website wants to send song requests as JSON, which the browser blocks too. Can the cupboard server let them in? Only them, mind.

The hall's page lives at `https://heronsgate-hall.example`, the station's site at `https://heronsgate-radio.example`, and the cupboard server at an address of its own. To a browser, those are three different places.

## An origin

An address's **origin** is three of its parts: the scheme, the host and the port. `https://fenwick-library.example/catalogue?q=moths` has the origin `https://fenwick-library.example`, with port 443, the usual one for https. Two addresses share an origin only when all three match:

- `http://fenwick-library.example` is another origin: the scheme differs.
- `https://fenwick-library.example:8443` is another origin: the port differs.
- `https://shop.fenwick-library.example` is another origin: the host differs.

`new URL(address).origin` gives the origin as text, with the host in small letters and the usual port left out. Notice that cookies do not care about the port, as the last issue showed, but origins do.

A browser lets a page's script read answers from its own origin. From any other origin, the script may send a request, but it may not read the answer unless the server says so. That rule exists because a browser can send a request with the person's cookies in it, and those cookies say who they are. Without the rule, any page they visit could read their messages or their account from another site where they are signed in.

## The header that allows it

When a page's script asks another origin, the browser adds an `origin` header that names the page's origin. The server answers as usual, and lets that page read the answer with `access-control-allow-origin`:

```
GET /books/new HTTP/1.1
origin: https://fenwick-school.example

HTTP/1.1 200 OK
access-control-allow-origin: https://fenwick-school.example
vary: Origin
```

The header names exactly one origin, compared whole by the browser, or `*` for any page at all. A list of origins is not allowed. When the answer does not let the page read it, `fetch` in the page stops with a `TypeError`. The request still reached the server, though: this rule protects what the answer says, not the server, and the next part is about requests that are held back.

A script can ask for the person's cookies to go along, with `fetch(address, { credentials: 'include' })`. Then the rules are stricter: `*` no longer counts, the header must name the page's origin, and the answer must also carry `access-control-allow-credentials: true`.

A server that answers differently for different origins adds `vary: Origin`. It tells caches, like the ones in the first issue of this part, that the answer depends on the `origin` header, so a copy made for one page is never handed to another.

## Asking first

Some requests go straight to the server: those a plain form or link could send anyway. The method is `GET`, `HEAD` or `POST`, and the script sets no headers beyond `accept`, `accept-language`, `content-language` and a `content-type` whose type is `application/x-www-form-urlencoded`, `multipart/form-data` or `text/plain`. The browser has a few more rules, like a simple `range` header that also goes straight, and limits for unusual or very long values, which this issue leaves out.

Anything else, like a `DELETE`, an `authorization` header or a JSON body, makes the browser ask first. It sends a **preflight**: an `OPTIONS` request with no body that describes the real one.

```
OPTIONS /books/7 HTTP/1.1
origin: https://fenwick-school.example
access-control-request-method: DELETE
access-control-request-headers: authorization

HTTP/1.1 204 No Content
access-control-allow-origin: https://fenwick-school.example
access-control-allow-methods: GET, DELETE
access-control-allow-headers: authorization
```

Only when that answer has a status in the 200s, names the page's origin, and lists the method and every header asked about, does the browser send the real request. Otherwise the real request is never sent. A browser is a little more lenient than this: it does not need `GET`, `HEAD` or `POST` listed, and without cookies it accepts `*` in place of most of these values. Naming each one, as here, always works. `access-control-max-age` lets the browser remember the answer for that many seconds.

## Your work in this issue

Open `src/origins.js`. Task 1 compares two origins. Tasks 2 and 4 are the browser's side: whether a page may read an answer, and whether a request needs asking first. Node has no such rule, so you write it, and a real browser does it for you. Tasks 3 and 5 are the server's side: let the trusted pages read, and answer the request that asks first.

Run `node run.js` after each task. Before Task 5, it shows what the cupboard server answers when the station's site asks first. Check uses servers, pages and rules of its own.
