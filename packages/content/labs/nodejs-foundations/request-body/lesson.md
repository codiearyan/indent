# Reading what was sent

## What you will be able to do

So far your server only answered questions. Now it receives something: a visitor's phone sends data in the **body** of a request, and the server reads it, checks it and keeps it. By the end of this issue you will be able to:

- read a body that arrives in pieces, until it ends
- read JSON from a request and answer with JSON
- refuse a body that is not JSON, or not what you expected, with 400
- refuse a body that is too large with 413, without reading all of it

## The request from Imran

> **Imran:** In the evening a volunteer reads the meter at each tap and writes the litres on the board in the shed. Half the time the board gets wiped before I copy it. Could their phones send the reading to the laptop instead? And I would like to see what each tap has used so far, without adding it up by hand.

## A body arrives in pieces

A `POST` request carries a body after its headers: the data being sent. When your function is called, the headers have arrived but the body may not have: it travels over the network in **chunks**, and a slow phone sends them with pauses in between. `req` is a stream, like the file you read a line at a time, and it gives you the chunks as they come.

Each chunk is a **Buffer**: raw bytes, not yet text. Collect them all, join them, and turn the bytes into text once the stream has ended:

```js
async function readText(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}
```

`for await` waits for each chunk and ends when the body ends. Using only the first chunk, or answering before the loop is done, works on your own computer, where a small body comes in one piece, and fails on a phone. Join the bytes before you make text of them: a letter like the â in Siân takes two bytes, and they can land in two chunks.

## JSON in, JSON out

JSON is the usual way to send data between programs: text that looks like a JavaScript value. `JSON.parse(text)` turns the text into a value, and `JSON.stringify(value)` turns a value back into text, ready for `res.end`, which only sends text.

```js
const order = JSON.parse('{"seed":"leek","packets":3}')
order.packets                    // 3, a number
JSON.stringify({ ok: true })     // '{"ok":true}'
```

An answer in JSON says so with the header `Content-Type: application/json; charset=utf-8`, so the program reading it knows how. A request that added something answers **201 Created** rather than 200. One thing to watch: `JSON.stringify` knows plain objects and arrays, but turns a `Map` into `{}`. `Object.fromEntries(map)` makes a plain object of it first.

## When the body is wrong

Text that is not JSON, half a body from a lost signal or an empty body, makes `JSON.parse` throw a SyntaxError. Uncaught, it stops the whole server, and every visitor after it gets nothing. Catch it and answer **400 Bad Request**: the mistake was in the request.

Even valid JSON may not be what you expect. `JSON.parse('null')` works, and so does `'"12"'`: JSON can be any value, not only an object, and a number sent as text is still text. Check the shape yourself before you keep anything: is it an object, is each field there, is each the type you need? `typeof` tells a `'number'` from a `'string'`.

## A body that is too large

Nothing stops a sender from sending a million bytes, by mistake or to fill the server's memory. A server keeps a limit, and answers **413 Content Too Large** past it. The header `Content-Length` can say how long a body will be, but a sender may leave it out and send the body in chunks until it is done, or give a length that is not true. So count the bytes yourself as the chunks arrive: a Buffer's `length` is its number of bytes. As soon as the count goes past the limit, stop. Leaving a `for await` loop early stops reading the stream, and the rest of the body is never kept.

## Your work in this issue

All four tasks are in `server.js`, which already listens, stops on Ctrl+C, and answers 404 and 405 for other addresses and methods. The readings live in the server's memory, so they are gone when it stops, which is fine for now. Run `node ask.js server.js`: each line of `requests.txt` is a method, an address and, for a `POST`, the body after them. `ask.js` sends every body in three pieces with a pause between, as a phone on a slow line would.
