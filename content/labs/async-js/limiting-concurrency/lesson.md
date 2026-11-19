# At most N at a time

## Too many emails at once

Every evening Tidewell emails a reminder to everyone sailing the next morning. Bram used what he learned last week and sent them all at once with `Promise.all`.

> **Bram:** The mail service started refusing us. It says three connections at a time, no more. Most reminders bounced, and one customer with a full mailbox stopped the whole run.

By the end of this issue you can run a long list of tasks with at most N in flight, keep the results in input order, and choose what a single failure should do to the rest.

## Why not everything at once

`Promise.all` over a list of a thousand items starts a thousand requests in the same instant. Real services push back: a mail server caps connections, an API has a rate limit, a database has a pool of a few connections. You need a way to say "at most 3 at a time" and still finish the whole list.

## Batches: the simple way

Cut the list into slices of N and run each slice with `Promise.all`, one slice after another. It is short and easy to reason about, and it never exceeds the limit.

Its weakness shows when tasks take different times. A batch is only as fast as its slowest task. While one slow email holds up the batch, the other two connections sit idle. Over a long list that idle time adds up.

## A pool of workers

A better shape keeps every slot busy. Picture N workers sharing one queue. Each worker takes the next item, waits for it, and immediately takes another, until the queue is empty. A slow task holds up only its own worker.

```js
async function drain(queue, handle) {
  while (queue.length > 0) {
    const job = queue.shift()
    await handle(job)
  }
}

await Promise.all([drain(queue, handle), drain(queue, handle)])
```

This sketch runs two workers but throws the results away. For a real pool you also need to know which item each result belongs to. A shared counter for the next index works well: each worker reads it and moves it on, and since JavaScript runs one piece of code at a time, two workers can never grab the same index. Store each result at its index, and the order is kept no matter who finishes first.

## When one fails

There is no single right answer, so make the choice on purpose.

**Fail fast.** Reject with the first error and start nothing new. Tasks already running cannot be stopped, but their results are ignored. Use this when one failure makes the whole job pointless, such as an import where every row must succeed.

**Collect everything.** Never stop, and report each item as a success or a failure, like `Promise.allSettled` does. Use this for independent work like reminder emails, where one full mailbox should not cost everyone else their reminder.

The neat part is that the second is easy to build from the first. If each task turns its own failure into a value, the fail fast pool never sees a failure.

## Faking the work

These functions take no clock at all. The slow part is the `fn` you hand them, so the check passes a fake job whose calls it finishes one by one, by hand. After each step it looks at which items have started, and it counts the most jobs running at the same moment.

## Try it

Run `node src/demo.js`. The first line sends everything at once and counts the refusals. The next lines use your batches and your pool and print how long each took, then show what happens when booking B9's mailbox is full. A finished pool should beat batches, refuse nothing, and stop at B9 only in the fail fast line.
