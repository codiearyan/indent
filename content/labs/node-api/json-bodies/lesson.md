# Reading what clients send

## What you will be able to do

Your health check and fleet list are live, and the booking page can read them. Now it needs to send something back. By the end of this chapter you will be able to:

- collect a request body from a stream, with a size limit
- turn the body into JSON and refuse text that is not JSON
- check each field of the input and explain every problem in one response
- pick the right status code for each kind of bad request

## The next message

Luka, Ines's nephew, is building the booking page.

> **Luka:** Can I post `{ "type": "double", "hours": 3 }` somewhere and get a price back? Right now I copy the rates from a photo of the whiteboard. Also, sorry in advance, I will definitely send you broken stuff while I build this.

The route `POST /quotes` is already wired in `src/app.js`. It reads the body with `readJson`, checks it with `validateQuote` and prices it with `priceQuote`. The first two are yours to write.

## A body arrives in pieces

`req` is a readable stream. The body does not sit on it as a property; it arrives in chunks, and you have all of it only when the stream ends. Each chunk is a `Buffer`, a run of raw bytes.

Here is a stream being read for a different purpose, counting lines in an upload:

```js
let lines = 0
for await (const chunk of req) {
  for (const byte of chunk) if (byte === 10) lines++
}
```

Two habits matter when you collect a body:

- **Join bytes, then decode.** A letter like `ø` is two bytes and can be split across two chunks. Turning each chunk into a string on its own can break it in half. Keep the Buffers in an array and decode once with `Buffer.concat(chunks).toString('utf8')`.
- **Count bytes, not characters.** A Buffer's `length` is in bytes, which is what the limit is about.

## Why a limit

Without a limit, anyone can post a gigabyte and your server will happily try to hold all of it in memory. A small API like this one never needs more than a few kilobytes, so `readBody` stops at 10000 bytes by default and refuses with **413 Payload Too Large**. The check is on the running total, so you stop reading as soon as you know the answer.

## Parsing is a trust boundary

`JSON.parse` throws a `SyntaxError` on text it cannot read. If that error escapes, the server answers 500, which says "we broke". That is wrong: the client sent bad text. Catch it and throw an `HttpError` with **400** and the code `invalid_json`. An empty body is the same mistake and deserves the same answer, with a clearer message.

`HttpError` lives in `src/errors.js`. Anything a handler throws ends up in the `catch` inside `createApp`, which turns an `HttpError` into a JSON error response with its status, code, message and details.

## Valid JSON is not valid input

`JSON.parse` succeeding only tells you the text was well formed. The value could be `null`, an array, a number or an object with the wrong fields. Check what you rely on:

- the shape: a plain object, which rules out `null` and arrays even though `typeof` says `'object'`
- each field's type and range: `"3"` is not `3`, and `2.5` hours is not a booking
- membership in a set of keys, using only the keys you wrote, not ones every object inherits

Collect the problems instead of stopping at the first. A client that fixes one field, posts again and learns about the next one will not thank you. Answer once with **400** and a `details` array:

```json
{ "error": { "code": "validation_failed", "message": "...", "details": [
  { "field": "type", "message": "must be one of single, double, paddleboard" }
] } }
```

Finally, return only the fields you checked. Extra fields like `isAdmin` should never ride along into the rest of your code.

## Try it

Run `node try.js`. It posts four bodies to `POST /quotes`: a good quote, broken JSON, a body with two bad fields and a body of about 20000 bytes. When you are done you should see 200 with a price, 400 `invalid_json`, 400 `validation_failed` with two details, and 413.
