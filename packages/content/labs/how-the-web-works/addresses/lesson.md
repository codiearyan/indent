# What an address is made of

## What you will be able to do

Heronsgate Community Radio is run by volunteers from a room above the village hall. Its programme listings and its song requests live on a small server in a cupboard next to the studio. You are the station's new volunteer developer, and everything in this repo is about the conversation between a program that asks and that server. By the end of this issue you will be able to:

- name the parts of an address and say what each one does
- take an address apart and put one together with `URL`
- send a request from Node with `fetch`, wait for the answer, and read its text

## The request from Odette

> **Odette:** The listings screen in the studio has shown a blank box since Tuesday. Gethin says it asks the cupboard server for the wrong address, but to me an address is just a line of text. Can you make sense of it, and get the screen its text again?

Odette runs the station and Gethin looks after the cupboard server. The screen is a small program, and one wrong character in the address it asks for is enough to get nothing back.

## One computer asks, another answers

"The internet" is not one thing. It is a great many computers, and most of what they do is ask each other for things. When you open a page, your browser sends a **request** to another computer, a **server**, and the server sends back an **answer** (often called a response). Every page, picture and search is one or more of these exchanges.

A server is just a program that waits for requests. The cupboard server is a JavaScript file in your workspace, `server/station.js`, and it runs on your own computer while you work, so you see both sides of every exchange.

## The parts of an address

An address says which server to ask and what to ask it for. Here is one for a weather service:

```
https://weather.example:8080/forecast/coast
```

- **Scheme**, `https`: the way to talk to the server. `https` is the private, encrypted way; `http` is the plain way, fine for a server on your own computer.
- **Host**, `weather.example`: the name of the computer to ask. `localhost` is the name every computer has for itself.
- **Port**, `8080`: one computer can run many servers, and each one listens on its own numbered port. Most addresses do not write the port. Then the scheme decides it: `80` for `http` and `443` for `https`.
- **Path**, `/forecast/coast`: which page on that server. It always starts with a slash.

You could cut an address apart with text methods, but the rules have corners. Node and browsers have `URL` built in, which knows them all:

```js
const url = new URL('https://weather.example:8080/forecast/coast')
url.protocol // 'https:'
url.hostname // 'weather.example'
url.host     // 'weather.example:8080'
url.port     // '8080', and '' when the address writes no port
url.pathname // '/forecast/coast'
```

Look closely at what each property holds. `protocol` keeps its colon, `host` keeps the port, and `port` is text, not a number.

## Putting an address together

Programs often know a server's address and the path of one page. Joining the two texts with `+` works until one of them has a slash too many or too few. `new URL` can take a path and an address to start from, and puts the slashes where they belong:

```js
const forecast = new URL('/forecast/hills', 'https://weather.example/')
forecast.href // 'https://weather.example/forecast/hills'
```

`href` is the whole address as text. A path that starts with a slash always starts from the host.

## Sending a request and waiting for the answer

Node has `fetch` built in. You give it an address and it sends a request there. The answer takes a moment to arrive, so `fetch` does not give back the answer itself. It gives back a **promise**, a value that says "the answer will be here soon". Writing `await` in front means "wait for the answer, then carry on with it". `await` only works inside a function marked `async`.

```js
async function readForecast(address) {
  const response = await fetch(address)
  const text = await response.text()
  return text
}
```

The answer is an object, not the text. Reading its body takes a moment too, so `response.text()` also needs `await`. A body can be read only once, so keep the text in a `const` if you want to print it and give it back.

Things that go wrong on the way:

- `Promise { <pending> }` in the terminal means a promise was printed before anyone waited for it. A missing `await` is the cause.
- `TypeError: fetch failed` with `ECONNREFUSED` in its cause means nothing answered at that host and port: the server is not running, or the port is wrong. With `unknown scheme` in its cause, the address is missing its `http://`.
- `TypeError: Invalid URL` from `new URL`, or `Failed to parse URL` from `fetch`, means the text was not a whole address, for example a path with no scheme and host in front.

## Your work in this issue

Open `src/address.js`. It has one function per task, each throwing `Not implemented` until you write it. The word `export` in front of each one lets `run.js` and Check use it, so leave it there.

Run `node run.js` after each task. It starts the cupboard server on a free port, so the port changes on every run, calls your functions, and prints each request the server received and each answer it sent. The header lines under a request are added by `fetch` itself; the third issue is about them. Check uses addresses and a server of its own.
