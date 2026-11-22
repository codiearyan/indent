# The families of statuses

## What you will be able to do

The listings screen now reads the whole answer, status and all. But there are dozens of statuses, and you do not need to learn them one by one: they come in five families, and the family tells you most of what to do. By the end of this issue you will be able to:

- name the family of any status from its first digit
- tell a mistake in the request from trouble on the server
- decide, per family, whether to use an answer, give up, or report a problem
- ask again when the server is in trouble, without asking forever

## The request from Gethin

> **Gethin:** The cupboard server restarts every night at three, and for a few seconds it answers 503 to everything. The overnight playlist script asks once, gets a 503, and gives up, so the station plays silence until someone wakes up. And when a show has been taken off the schedule, the script treats the 404 just like the 503. Those are not the same thing at all.

Gethin is right. One answer means "come back in a moment" and the other means "there is nothing here, and there will not be".

## Five families

The first digit of a status names its family:

- **1xx, information.** The server is still working on it. You will rarely see these.
- **2xx, success.** It went well. `200 OK` is the usual one; `201 Created` says something new was made; `204 No Content` says it went well and there is no body.
- **3xx, redirect.** What you asked for is somewhere else. `fetch` follows these by itself to the new address, so your code mostly sees the answer from there. A later issue is about them.
- **4xx, client error.** The asker got something wrong: `400 Bad Request` for a request the server cannot make sense of, `401 Unauthorized` for a missing key, `403 Forbidden` for a key that is not allowed, `404 Not Found` for nothing at that path, `410 Gone` for something that was there and was removed for good. Asking again the same way gets the same answer. The request has to change.
- **5xx, server error.** The request may be fine, but the server could not answer it: `500 Internal Server Error` when its code broke, `502 Bad Gateway` when a server behind it failed, `503 Service Unavailable` when it is too busy or restarting. The same request may work in a moment.

Statuses with no family, below 100 or above 599, are not real statuses at all.

## Working out the family

A status is a number, so the family is arithmetic. Dividing by 100 and dropping what is after the point gives the first digit:

```js
Math.floor(429 / 100) // 4, a client error
Math.floor(503 / 100) // 5, a server error
```

Or compare with the edges of each family. Each one starts at a number ending in 00 and ends at one ending in 99, so `status >= 400 && status <= 499` is the whole client error family, 400 and 499 included. A test like `status === 404` only knows one member, and misses 410 the day a server sends it.

## Deciding what to do

Code that talks to a server should make a decision for each family:

- **Success**: use the answer.
- **Client error**: asking again will not help. Give a plain result that says "not there", like `null`, or tell the person to change what they asked.
- **Server error**: it is not the asker's fault, and nothing useful came back. Stop and say so.

To stop a function and say why, **throw** an error:

```js
throw new Error(`The weather service answered ${response.status}`)
```

`throw` ends the function at once, like `return`, but instead of a value it hands an error to whoever called it. If they called it with `await`, the error comes out right there, and if nobody catches it, the program stops and prints it. `run.js` catches it and prints your message. Put the status number in it: it is the first thing anyone will ask.

## Asking again, but not forever

A server error is often over in a moment, so asking again a few times is reasonable. A loop that asks again needs two ways out: an answer that is not a server error, and a limit on the number of requests. Without the limit, a server that stays down gets asked thousands of times a second, which can keep it down. Never ask again after a client error: it gets the same answer every time.

If a script you run keeps going and prints nothing, it may be stuck in such a loop. Press Ctrl+C in the terminal to stop it.

## Your work in this issue

Open `src/statuses.js`. Task 1 names the family of a status. Tasks 2 and 3 can use it: Task 2 decides what to do with a show's answer, and Task 3 asks again while the server is in trouble.

Run `node run.js` after each task. The cupboard server answers `503` to the first two requests for tonight's playlist, as it does just after a restart. Check uses a server of its own, with its own statuses, some that recover and some that never do.
