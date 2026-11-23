# A first server

## What you will be able to do

Every script so far was started by someone at the shed laptop and answered them in the terminal. A server is a script that keeps running and answers other programs, such as a browser on someone's phone, whenever they ask. In this first issue of the last part you write one with Node's own `node:http`. By the end of it you will be able to:

- make a server, have it listen on a port, and answer each request
- give an answer a status and a header, and say why the order matters
- take the port from a setting, and read the error when the port is taken
- stop a server cleanly on Ctrl+C

## The request from Rhiannon

> **Rhiannon:** Every evening my phone rings: is there a plot free? I open the plot list and read it out. The shed laptop is on the society's wifi all day. Could it answer them itself, so anyone at the gate can open an address on their phone and see which plots are free?

## A server waits for requests

A browser that opens an address sends a **request** to the computer at that address, and waits for an **answer**. A server is the program on that computer that listens for requests and answers them. In Node, `createServer` from `node:http` makes one. You give it a function, and Node calls it once for every request:

```js
import { createServer } from 'node:http'

const server = createServer((req, res) => {
  res.end('The tool shed opens at 9.\n')
})
server.listen(8080, () => {
  console.log('Listening on http://localhost:8080')
})
```

`req` describes the request: its address, its method, its headers. `res` is the answer you are writing. `res.end(text)` sends `text` as the **body** and finishes the answer. Until it is called, the request waits, and the browser keeps loading. An answer that is never ended is the most common reason a server "does nothing". The function may be `async`, so it can `await` a file before it answers.

A listening server keeps the script running, like a timer: the prompt does not come back. That is what a server is for.

## Ports

One computer can run many servers, so each listens on its own **port**, a number from 1 to 65535. The address `http://localhost:8080` means "this computer, port 8080". The port belongs in a setting, not in the code, so whoever starts the server can choose one, and most servers read it from `PORT` in the environment, with a default when it is not set.

Two programs cannot listen on the same port. The second one fails, but not on the line that calls `listen`: a moment later the server emits an `error` event, and with no listener for it, Node stops with a stack and this line:

```
Error: listen EADDRINUSE: address already in use :::8080
```

`EADDRINUSE` is the error's `code`: the address is in use. A listener, `server.on('error', ...)`, gets the error instead, so the script can say in plain words which port is taken and end with exit code 1. The usual cause is a copy of your own server still running in another terminal.

## Status and headers

Every answer carries a **status**, a number that says how it went, before its body. `200` means all is well, and is what Node sends unless you set another. A status from 500 up means the server failed: `500` is the general one. Other programs read the status, not the words of the body, so a failure answered with 200 looks like success to them.

An answer also carries **headers**, names with values that describe it. `Content-Type` tells a browser what the body is: `text/plain; charset=utf-8` says plain text, in the UTF-8 characters, so a name like Siân shows as written.

```js
res.statusCode = 503
res.setHeader('Content-Type', 'text/plain; charset=utf-8')
res.end('The tool shed is closed for stocktaking.\n')
```

Status and headers travel first, so they must be set before any of the body is sent. Set a header after `res.write(...)` or `res.end(...)` and Node throws `Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client`. A status set then throws nothing, but it is too late: the visitor already got the old one. And an error that nobody catches inside the function, such as a file that is not there, stops the whole server, not just one answer. Catch it and answer 500 instead.

## Stopping a server

Ctrl+C ends a server on the spot, in the middle of any answer it was sending. With a listener for `SIGINT`, as in the issue on timers, it can stop properly instead: `server.close(callback)` stops taking new requests, lets the answers on their way finish, and then calls `callback`. Once the server is closed, nothing keeps the script running, and it ends by itself.

## Your work in this issue

All four tasks are in `server.js`, and `plots.txt` is the plot list in the same form as before. To try your server, run `node ask.js server.js`: it starts the server with a free port in `PORT`, sends it each request in `requests.txt`, shows each answer and what the server printed, and stops it. Change `requests.txt` to send other requests. Once task 3 gives the port a default, you can also run `node server.js`, open http://localhost:3000 in a browser while it runs, and press Ctrl+C when you are done. The first time a server listens, your system may ask whether Node may accept connections from the network. Requests from this computer work either way.
