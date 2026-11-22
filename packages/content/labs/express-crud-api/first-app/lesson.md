# A first Express app

## What you will be able to do

Copperleaf Pottery is a small studio with six wheels, two long tables and a kiln out the back. It runs evening and weekend workshops, and every place is still booked on a paper sheet by the door. You are the developer the studio hired to build the JSON API behind its new sign-up page, with Express. By the end of this issue you will be able to:

- create an Express app and keep it apart from the server that listens
- add a route for a method and a path
- answer with JSON and the status you choose
- give every request nobody answered a clear 404 in JSON

## The request from Nadia

Nadia Osei owns Copperleaf and teaches most of the wheel classes. Her first note is short.

> **Nadia:** Ivo is building the sign-up page. Before anything else he needs two things from you: a way to tell the API is running, and the list of this week's workshops. And please, when he asks for something that does not exist, tell him in a way his page can read.

That is two routes, `GET /health` and `GET /workshops`, and one rule for everything else.

## Why a framework

Node can already answer HTTP requests with `node:http`. It hands you a request and a response and leaves the rest to you: reading the path, picking what to run, writing headers, turning values into JSON. Every API does those same chores. Express does them once, so your code says only what is different about your API.

An Express app is a function made by calling `express()`. You add routes to it, then hand it to a server. `app.listen(port)` makes that server for you:

```js
import express from 'express'

const app = express()
app.get('/opening-hours', (req, res) => {
  res.json({ weekdays: '10 to 18', weekends: '9 to 13' })
})
app.listen(3000)
```

## Routes and answers

`app.get(path, handler)` says: when a `GET` request arrives for this path, run this function. There is one of these for every method: `app.post`, `app.put`, `app.patch`, `app.delete`. The handler gets two objects. `req` holds what the client sent. `res` has the methods that answer.

`res.json(value)` turns a value into JSON text, sets the `content-type` header to `application/json; charset=utf-8`, sets the length and sends it. The status is 200 unless you say otherwise, and you say otherwise with `res.status()` before you send:

```js
res.status(503).json({ error: { code: 'closed', message: 'Back at nine' } })
```

`res.status()` returns `res` again, which is why the two calls can sit in one line.

Express also matches on the path alone. A request for `/opening-hours?lang=fr` reaches the `/opening-hours` route with no extra work, and the query string waits in `req.query` for when you need it.

## An app that does not listen

In this repo, `createApp()` builds the app and returns it without calling `listen()`. `server.js` listens on port 3000 so you can try it with `curl`. `try.js` and the checks start the same app on port `0`, which asks the system for any free port, so two runs never fight over one. Keeping the app apart from the server also means a test can make a fresh app with its own data every time. That is why `createApp` takes a `store`: the checks pass in workshops of their own.

The store is already written, in `src/store.js`. It keeps the workshops in memory and hands out copies. Your job in this repo is the HTTP part.

## In order, until someone answers

Express keeps your routes and middleware in a list, in the order you added them. For each request it walks down the list and runs the first thing that matches. Once a handler sends an answer, the walk is over.

A request that reaches the end of the list without an answer gets a small HTML page that says `Cannot GET /kilns`. A browser can show that, but Ivo's page expects JSON. So the last thing in the list should be a handler that matches everything:

```js
app.use((req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: 'Nothing here' } })
})
```

`app.use(handler)` without a path runs for any method and any path. Put it first and it would answer every request before your routes had a chance. Put it last and it only sees what nothing else answered.

The `code` is for programs and never changes. The `message` is for people.

## Your work in this issue

Everything happens in `src/app.js`. Write `createApp` so it makes the app and returns it, with the health check. Then add the list of workshops from the store, and last, the JSON 404 for everything else.

Run `node try.js` after each step. It starts your app, sends four requests, prints the status, the content type and the body of each, and stops. Before you write anything it says `createApp() threw: Not implemented`. When you are done you should see the health check, the workshops, and two JSON 404s.

If you prefer `curl`, run `node server.js` in one tab and `curl -i http://localhost:3000/health` in another. The `-i` flag prints the status and headers too.
