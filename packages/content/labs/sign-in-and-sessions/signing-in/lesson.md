# Signing in

## What you will be able to do

The API now keeps a salted hash for each member of staff, and `createApp` builds the team's store when it starts. Nobody can sign in yet. In this issue you add the route that takes an email and a password and says yes or no, and you make sure the way it says no gives nothing away. By the end you will be able to:

- check a sign-in so a wrong password and an unknown email look exactly alike
- make both of them take the same time
- read and refuse a sign-in body that is not usable
- write log lines that say what happened, never what was typed

## The request from Sunniva

Sunniva runs the front desk. She is the first who will use the sign-in every morning.

> **Sunniva:** I'd like to type my email and my password and be in. One thing, though. When I got my email wrong on the old booking site, it said "no account with that email". So anyone could type a name and find out whether that person works here. Please don't do that.

She is right, and it goes further than the message.

## One answer for every kind of no

A sign-in can fail in two ways: nobody has that email, or someone does and the password is wrong. It is tempting to say which, because it helps the person who mistyped. It helps a stranger more. With two different answers, anyone can test a list of emails and learn which of them belong to staff, and those are the accounts worth guessing passwords for.

So both failures get one answer: the same status, the same code and the same sentence, character for character. "That email and password do not match" is true in both cases, and says nothing about which part was wrong.

Some failures are different and may say so. A body with no password is not a wrong guess, it is a broken request, and a `400` that says "send an email and a password" reveals nothing about anyone. A `401` is for "I could not tell who you are".

## The same amount of work

There is a quieter way to tell the two failures apart: time. For an unknown email the quick thing is to stop at once. For a known email the code runs scrypt, which takes a noticeable moment. Anyone who times a few hundred answers can see which emails make the server think.

The answer is to do the same work either way. Picture a ticket desk that checks a ticket against the booking: when there is no booking, it still runs the same slow check against a stand-in, then says no. In code, that stand-in is a hash made once, when the module loads, from a password nobody has. An unknown email is checked against it, the check fails as it should, and the time it took looks like any other refusal.

## Reading a sign-in body

`express.json()` fills `req.body` only when a request has a JSON body. When a request has no body at all, `req.body` is `undefined`, and reading a field from it throws. A fallback avoids that:

```js
const { title } = req.body ?? {}
```

Then check what arrived. JSON can carry numbers, lists and `null` as easily as text, so a field you expect to be text should be tested with `typeof value === 'string'` and for being empty. Anything else is a `400`, before any password is checked.

## What a log line may say

The studio wants to see who tried to sign in, and when. A log is the place for that, and on a server everything printed with `console.log` or `console.error` ends up in one. A log is read by more people than the code, kept for a long time and copied into backups.

So a log line says what happened, to whom and how it ended: `sign-in refused for kofi@...`. It never repeats what was typed. The easy mistake is a helpful line such as:

```js
console.log('new booking', req.body)
```

It logs whatever the body holds, today and after someone adds a field to it next year. On a sign-in route that is the password. Logging a member taken straight from the staff store is the same mistake with the hash. Build each line from the one fact you mean to log, on every path out of the route, the refusals and the broken bodies too.

## Your work in this issue

Start in `src/signIn.js` with `checkSignIn`, which finds the member and checks the password. Then write `signInRouter` in `src/routes/signIn.js` and mount it in `src/app.js`. Last, add the log lines to the route.

Run `node try.js` after each task. It signs Kofi in, then tries a wrong password, an email nobody has and a body without a password, and prints each answer with your log lines above it. When you are done you see a `200`, two identical `401`s and a `400`, and no password in any line.
