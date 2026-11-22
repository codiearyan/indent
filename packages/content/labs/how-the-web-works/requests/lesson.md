# A request has a method, a path and headers

## What you will be able to do

So far every request you sent asked to read a page. But a request can ask for other things too, and it can carry notes about who is asking and what kind of answer they want. In this issue you look inside a request, line by line. By the end of it you will be able to:

- read the first line of a request and write one yourself
- send a request with a method other than GET
- add headers to a request, and say why their names must be spelt exactly
- ask a server for a particular kind of answer

## The request from Gethin

> **Gethin:** When Ffion has played a song request, it should come off the list. Today the only way is for me to open the cupboard and edit a file by hand. The server can remove a request itself if you ask it the right way, but it only lets the studio do it. Can you write that?

Gethin looks after the cupboard server. The song requests are at paths like `/requests/41`, and you can read one with an ordinary GET already.

## What a request looks like

A request is text. Here is one that a library's web page might send to cancel a book someone put on hold:

```
DELETE /holds/310?branch=north HTTP/1.1
host: library.example
accept: text/plain
authorization: Bearer card-5521
```

The **first line** has three parts with a space between each: the **method** (`DELETE`), the **target**, which is the path with its question mark part, and the version of the conversation, `HTTP/1.1`. The scheme and the host are not on that line. The host travels in a `host` header, because one computer can answer for many names.

Every line after it is a **header**: a name, a colon, and a value. When the headers end, a blank line follows, and then a body if the request has one. You will send bodies in a later issue.

`run.js` prints every request in this shape, so you have been reading them since the first issue.

## The method says what to do

The same path can mean different things depending on the method. The common ones:

- `GET` reads what is at the path. It is what `fetch` sends when you tell it nothing else.
- `POST` adds something new.
- `PUT` replaces what is at the path.
- `DELETE` removes what is at the path.

The server decides what each method does on each path, and which ones it allows. A method it does not know at all, like `REMOVE`, the cupboard server turns away before it reads the rest of the request. Methods are written in capitals.

To send another method, hand `fetch` a second value: an object of options.

```js
const response = await fetch('https://library.example/holds/310', { method: 'DELETE' })
```

## Headers say more about the request

Headers are how a request says things that are not part of the address: who is asking, what kinds of answer it can use, what language the person reads. A few you will meet often:

- `accept` names the kinds of answer the asker wants, like `text/html` for a web page or `text/plain` for plain text. `*/*` means any kind.
- `authorization` proves who is asking. A common form is the word `Bearer`, a space, and a key or token the server gave out.
- `user-agent` names the program that sent the request.

`fetch` adds some headers by itself, like `host`, `accept: */*` and `user-agent: node`. To send your own, put a `headers` object in the options. Its property names are header names:

```js
const response = await fetch('https://library.example/holds/310', {
  method: 'DELETE',
  headers: { authorization: 'Bearer card-5521', 'accept-language': 'cy' }
})
```

A name with a hyphen needs quotes as a property name. Header names do not care about capital letters, so `Accept` and `accept` are the same header. But they do care about spelling. A server looks for a header by its exact name, so `authorisation` with an s is simply another header that it never reads, and the request arrives as if it had none. No error tells you: the server just answers as if you sent nothing. That is why `run.js` printing every header is so useful.

A secret such as a key belongs in a header, never in the address. Addresses end up in logs, in browser history and on screens.

## Your work in this issue

Open `src/requests.js`. Task 1 writes the first line of a request as text, so you see exactly what travels. Tasks 2 and 3 remove a song request, first without and then with the studio key. Task 4 asks for the same page as HTML and as plain text.

Run `node run.js` after each task and read the requests it prints. When the cupboard server refuses, the answer starts with a number like `401` or `403`. That number is the answer's status, and the next issue is about it. Check uses a server of its own, with its own song requests, keys and pages.
