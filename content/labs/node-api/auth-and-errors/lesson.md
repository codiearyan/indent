# Locks and safety nets

## What you will be able to do

The booking page is live, and the back office can add and retire boats. That is also the problem: anyone who finds the URL can. By the end of this issue you will be able to:

- protect the routes that change data with a bearer token
- tell 401 and 403 apart, and send the header clients expect
- turn every thrown error into JSON in one place, without leaking internals
- give each request an id that ties a client's report to your logs

## Two messages on a Monday

> **Bram:** Someone deleted Otter on Saturday night. She was on the dock the whole time. I put her back, but how did that happen?

> **Ines:** And a customer sent me a screenshot of an error with a file path and something that looked like a password in it. Is that normal?

Neither is normal. The write routes are open to the world, and the catch in `createApp` sends `err.message` straight to the client.

## Bearer tokens

The back office will send a token with every request that changes data:

```
Authorization: Bearer dock-staff-7f3a
```

`src/tokens.js` maps each token to a role. Staff can change the fleet; the front desk can only look. Reading stays open, because the public booking page needs it.

There are two different ways to say no, and clients act on them differently:

- **401 Unauthorized** means "I do not know who you are": no header, the wrong format or a token you have never seen. Add a `www-authenticate: Bearer` header so the client knows which kind of credentials to send. The right move for the client is to sign in again.
- **403 Forbidden** means "I know who you are, and you may not do this". Signing in again will not help.

Check the token before anything else in the handler. If you read the body first, a stranger learns about your JSON rules, and in the worst case your code does work for someone who was never allowed to ask.

## One place for errors

Errors come from everywhere: the body reader, validation, the store, the router and plain bugs. If each place formats its own response, they drift apart, and one of them will eventually leak. Put the decision in one function, `handleError`, and send every error through it:

- An `HttpError` was thrown on purpose. Its status, code and message were written for the client, so send them.
- Anything else is a bug. The message was written for developers and can hold paths, hostnames or secrets. Log the full error for the team and send the client a fixed sentence and a 500.

Here is the same split in a small job runner:

```js
try {
  await job.run()
} catch (err) {
  report(err)
  notifyUser('The export failed. We are looking into it.')
}
```

The person waiting gets a calm message; the full error goes where the team will read it.

## Request ids

A fixed message is safe but vague. When Ines forwards a complaint, how do you find the matching log line? Give every request an id, put it in an `x-request-id` header on every response and in error bodies, and include it in the log.

If the client already sent an id, for example the booking page tagging its own calls, keep it so both sides share one name for the request. But treat it like any input: it goes into your headers and logs, so only accept a short, safe shape, and otherwise make a new one with `randomUUID()`. Set the header before routing so even a 404 has one.

## Try it

Run `node try.js`. It reads a boat with its own request id, then tries to add Kestrel with no token, a front desk token and a staff token, and sends a bad query. Last, it calls a second app whose store is broken on purpose. When you are done, that 500 says nothing about disks or paths, while the `[log]` line above it has the full story and the same id.
