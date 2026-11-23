# Sending data and saying what kind it is

## What you will be able to do

You can read JSON that a server sends. Now it goes the other way: your program sends data, and the server keeps it. That needs a request with a body, and a header that says what kind of body it is. By the end of this issue you will be able to:

- send a request with a body, and say what travels where
- send JSON with the `content-type` that names it
- read where the server put what you sent
- read why a server said no, from the body of its answer

## The request from Ffion

> **Ffion:** During the late show, listeners text me song requests, and I write them on a pad. Afterwards Gethin types them into a file in the cupboard. Half of them are gone by Sunday. Gethin says the server can now take a request straight from the studio laptop, but when I tried, it said "Unsupported Media Type". What does that even mean?

The cupboard server has a new address for this, `/api/requests`. It takes a song request as JSON, and only as JSON.

## A request with a body

Until now every request ended after its headers. A request that sends data carries it in a **body**, after a blank line, the same way an answer does. Here is a request that puts a book on hold at a library:

```
POST /api/holds HTTP/1.1
host: library.example
content-type: application/json
content-length: 36

{"book":"The Salt Road","card":5521}
```

The method is `POST`, which asks the server to add something new. `content-length` counts the bytes of the body, and `fetch` works it out for you. The header that is yours to get right is `content-type`: it tells the server what kind of body follows, so it knows how to read it. You met it in answers; in a request it means the same thing.

A GET asks to read, so it has nothing to send, and `fetch` will not send a body with one. It refuses before anything leaves: `TypeError: Request with GET/HEAD method cannot have body.`

## Saying what kind it is

You give `fetch` the body in its options, as text:

```js
const response = await fetch('https://library.example/api/holds', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ book: 'The Salt Road', card: 5521 })
})
```

Two things here are easy to miss, and `fetch` will not warn you about either:

- **The body has to be text.** Handed an object, `fetch` turns it into text the way JavaScript does by default, and the server receives the words `[object Object]`. `JSON.stringify` writes the object as JSON.
- **The header has to say JSON.** For a body of text with no `content-type` of yours, `fetch` adds `content-type: text/plain;charset=UTF-8`. The text may be perfect JSON, but the label says plain text, and a careful server goes by the label.

A server that cannot read the kind of body it was sent answers **415 Unsupported Media Type**: "media type" is the formal name for what `content-type` holds. That is what Ffion saw.

## What comes back when something is made

A server that made something new often answers **201 Created** instead of `200 OK`. Two parts of that answer are worth reading:

- The body usually describes what was made, often with an id the server gave it.
- The `location` header says where the new thing now lives, so you can ask for it later.

The `location` may be a whole address or only a path, like `/api/holds/310`. A path alone means "on the same server". `new URL(location, address)` turns either into a whole address, as you did in the first issue: a whole address stays as it is, and a path is joined to the scheme and host of the address you sent the request to.

## When the server says no

A server that refuses usually says why in the body, and when it speaks JSON, the reason is JSON too:

```
HTTP/1.1 409 Conflict
content-type: application/json

{"error":"The Salt Road is already on hold for card 5521."}
```

The status says which family the problem is in. The body says what to change. `400 Bad Request` means something in what you sent is wrong or missing, and `409 Conflict` means it clashes with something the server already has. Neither will change if you send the same thing again, so show the reason to the person who can fix it.

## Your work in this issue

Open `src/send.js`. Task 1 adds a song request and reads the id the server gives it. Task 2 sends the same request and reads where the new request lives. Task 3 says whether it was added, and when it was not, why.

Run `node run.js` after each task. Each request it prints now has a body under its headers. Bram's request is already on the list, so the server refuses it a second time. Check uses a server of its own, with songs, ids and reasons of its own.
