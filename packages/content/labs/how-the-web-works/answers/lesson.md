# An answer has a status, headers and a body

## What you will be able to do

You can now write a request with any method and any headers. The answer that comes back has the same shape: a first line, headers, and a body. Until now you only read the body. In this issue you read the rest, which is where a server says whether things went well. By the end of it you will be able to:

- read the status of an answer, its number and its reason
- read any header of an answer, and know what comes back when it is missing
- read a body once and keep it
- tell an answer that came back from an answer that went well

## The request from Odette

> **Odette:** Sometimes the listings screen shows "No show called midnight-quiz on the schedule", in big letters, as if it were a show. And on Monday it showed a sentence about a broken line. Gethin says the server tells you when something is wrong, before the text even starts. Why doesn't the screen look?

The listings screen only ever reads the body. Whatever the server says, the screen puts it up.

## What an answer looks like

Here is an answer from a library's catalogue:

```
HTTP/1.1 404 Not Found
content-type: text/plain; charset=utf-8
content-length: 26

No book with the number 77
```

The **status line** comes first: the version, a three digit **status code**, and a **reason**. The code is for programs: `200` means it went well, `404` means there is nothing at that path, `500` means the server broke while answering. The reason is for people reading along, and a server may write any reason it likes. Programs decide by the number.

Then come the **headers**, as in a request. `content-type` says what kind of body follows: `text/plain` for plain text, `text/html` for a page, and after a semicolon the `charset`, how the letters are stored. `content-length` says how many bytes the body has.

After a blank line comes the **body**. Here it explains what went wrong, which is why the listings screen showed it: the body of a `404` is still a body.

## Reading the status

The answer you get from `fetch` has the status line in properties:

```js
const response = await fetch('https://library.example/books/77')
response.status     // 404, a number
response.statusText // 'Not Found', the reason as the server wrote it
response.ok         // false
```

`response.ok` is `true` when the status is from 200 to 299 and `false` for anything else. Remember that `status` is a number: `response.status === '404'`, with quotes, compares it with text and is never true.

Here is the surprise for most people: `fetch` does not fail on a `404` or a `500`. It only fails, with `TypeError: fetch failed`, when no answer came back at all. An answer that says "not found" is still an answer, and it is your code's job to look at the status.

## Reading headers

`response.headers` holds the headers of the answer, but it is not a plain object, so `response.headers['content-type']` is `undefined` even when the header is there. Read a header with `get`:

```js
response.headers.get('content-type')   // 'text/plain; charset=utf-8'
response.headers.get('Content-Length') // '26', names ignore capitals
response.headers.get('x-shelf')        // null, there is no such header
```

Header values are text, like everything in the address. `get` gives `null` for a header the answer does not have, so check for `null` before you use the value.

## Reading the body once

The body arrives as a stream, so it can be read only once. A second `response.text()` on the same answer stops with `TypeError: Body is unusable: Body has already been read`. Read it one time, keep it in a `const`, and use that. Remember the `await` here too: without it you keep a promise, and the terminal shows `Promise { <pending> }` where you expected text.

Also send one request per answer you need. Asking twice for the same page to read its status one time and its body the next is two requests and two answers, and they may not even say the same thing.

## Your work in this issue

Open `src/answers.js`. Task 1 reads the status line, Task 2 one header, and Task 3 everything at once, from one answer.

Run `node run.js` after each task. It asks the cupboard server for pages that go well, a show that is not on the schedule, the test card that breaks the server, and `/ping`, which answers `204 No Content`: it went well, and there is no body and no content-type. Check uses a server of its own, with statuses, reasons and headers of its own.
