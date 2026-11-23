# Keeping a copy, and asking if it changed

## What you will be able to do

So far every answer was used once and thrown away. Programs that ask for the same thing again and again can keep a copy instead, and that is the start of this last part of the repo: what a program may keep, what it remembers for a server, and who else may read the answers. By the end of this issue you will be able to:

- read what `cache-control` says about keeping an answer, and for how long
- tell a fresh copy from a stale one at a given time
- ask a server whether a copy has changed, and read its short answer
- say when a kept copy is the right answer and when it is a bug

## The request from Gethin

> **Gethin:** The cupboard server's fan never stops. The four studio screens each ask for the whole listings every ten seconds, and the listings change about once a week. Can the screens keep what they got, and ask again only when they need to?

Every ten seconds, four screens fetch the same body and throw away the one they already had. The server already says how long its listings may be kept. Nobody reads it.

## What an answer says about keeping it

A server says how an answer may be kept in its `cache-control` header. Here is a ferry company's timetable:

```
HTTP/1.1 200 OK
content-type: application/json
cache-control: public, max-age=3600
etag: "tt-2024-spring"
```

The header is a list of **directives**, separated by commas. Their names ignore capital letters, they come in any order, and a value may be written `max-age=3600` or `max-age="3600"`. The ones that matter most:

- `max-age=3600`: a copy may be used for 3600 **seconds** without asking again.
- `no-cache`: keep a copy, but ask the server before every use. The name misleads many people: it does not mean "do not keep".
- `no-store`: do not keep it at all. For answers with private details in them.
- `private` and `public`: whether a cache shared by many people, like one in an office network, may keep it. `private` is for answers about one person. A program's own copy may keep either.
- `s-maxage=600`: a lifetime only for those shared caches. A program's own copy ignores it.

When two directives disagree, the stricter one wins: `max-age=600, no-cache` means ask every time. When there is no `cache-control` at all, a browser may guess a lifetime from other headers. The studio screens will not guess: no lifetime means ask.

## Fresh and stale

A copy's **age** is the time since it was received, or since the server last confirmed it. While its age is less than its lifetime, the copy is **fresh** and can be used without asking. Once the age reaches the lifetime, it is **stale**. This is simpler than a browser: it also adds the time an answer spent on its way and any `age` header the answer carries, and with no `max-age` it reads a lifetime from an `expires` date. The studio screens leave those out.

Watch the units. `max-age` counts seconds, but JavaScript counts time in milliseconds: `Date.now()` gives the number of milliseconds since the start of 1970. A ferry timetable stored at `storedAt` with `max-age=3600` is fresh while `now - storedAt` is less than 3,600,000. Your functions get `now` handed to them instead of reading the clock, so the same copy can be tried at any moment, the way Check does.

## Asking "has it changed?"

A stale copy is not necessarily wrong. It may be exactly what the server has now. The `etag` header is a **validator**: a label in double quotes that changes whenever the body changes. A `W/` in front, as in `W/"tt-2024-spring"`, marks a weak one, which may stay the same through a small change that leaves the meaning alone. Either way, the whole thing, quotes and all, is the etag.

To ask whether a copy has changed, send its etag back under `if-none-match`:

```js
const response = await fetch('https://ferry.example/timetable', {
  headers: { 'if-none-match': '"tt-2024-spring"' }
})
response.status // 304 when the timetable is the same
response.ok     // false: ok is true only from 200 to 299
```

When nothing changed, the server answers **304 Not Modified**, with no body at all. It is not an error. It means "use the copy you have", and it carries the `cache-control` and `etag` to keep from now on, so the copy is as good as new from that moment. When something did change, the answer is an ordinary `200` with the new body and a new etag.

Node's `fetch` adds `cache-control: no-cache` and `pragma: no-cache` to a request that carries a validator. In a request they ask any cache on the way to let the question reach the server.

## When a copy is right, and when it is a bug

A browser does all of this by itself: it keeps answers, works out their age and asks with their etag, and a page never sees it happen. Node's `fetch` keeps nothing, which is why the studio screens need your code.

A kept copy is the right answer while it is fresh: nobody waits, and the server does no work. It becomes a bug when it is used past its lifetime, because people see old listings, and when an answer that said `no-store` or `private` is kept where others can read it.

## Your work in this issue

Open `src/cache.js`. Task 1 reads a `cache-control` header. Task 2 says whether a copy is fresh at a given time. Task 3 asks the server whether a copy changed. Task 4 puts them together for a studio screen. Tasks 2 and 4 can use your earlier functions.

Run `node run.js` after each task. It reads what three of the server's pages say about keeping them, then refreshes the listings twice and plays one screen asking three times. Check uses a server of its own, with bodies, etags, lifetimes and times of its own.
