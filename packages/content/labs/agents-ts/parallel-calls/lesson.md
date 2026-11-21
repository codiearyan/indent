# Three scans at once

## What you will be able to do

Pip now recovers from its own mistakes. It is also slow on busy mornings. By the end of this issue you will be able to:

- recognise a reply that asks for several tools at once
- run those calls concurrently instead of one after another
- answer every call by its id, in a fixed order, even when they finish out of order
- explain why the order of your tool messages should never depend on timing

## The request from Noor

> **Noor:** When I ask Pip about three products, I can count the seconds. The shelf scanner is slow, fine, but it is checking one aisle, then the next, then the next. Can't it check them together?

The model already does its part. Asked about oat milk, rye bread and eggs, it sends one reply with three `check_stock` calls. They do not depend on each other. Your loop runs them in turn, waiting for each scan before starting the next, so the total is the sum of all three.

## Parallel tool calls

When a reply holds several tool calls, the model is telling you they are independent: it needs all the results before it can continue, and it does not care in which order you get them. That is permission to run them concurrently. The total time becomes roughly the slowest call instead of the sum.

The API still has the same rule as before: after the assistant message, send exactly one tool message for each call, each with its own `tool_call_id`. It does not require a particular order. Your code should pick one anyway, and the obvious one is the order of the calls.

## Starting work at once in JavaScript

A promise starts its work when it is created, not when you await it. So the pattern is: create all the promises first, then wait for all of them. Here it is with a different job, fetching three delivery quotes:

```ts
const couriers = ['north', 'river', 'hill']
const quotes = await Promise.all(couriers.map((name) => fetchQuote(name)))
// quotes[0] is north's, whichever answered first
```

`Promise.all` resolves with the results in the order of the input array, not the order in which they settled. If any promise rejects, the whole thing rejects, which is why it pairs well with a function that turns failures into values, like your `executeToolCall`.

## Why order matters when the API does not care

Imagine collecting results by pushing each one into an array as it arrives. Today oat milk is slowest. Tomorrow the eggs aisle is. The conversation you send changes from run to run, and so can the model's answer. Logs stop lining up, tests become flaky, and a bug that pairs the wrong result with the wrong id shows up only on some days.

The local model reads each result by its id and checks that the product in the result is the one the call asked about. If a result lands under the wrong id, Pip says so in its answer. Keep two things fixed: the order is the order of the calls, and each message is built from its own call.

## What concurrency does not fix

Running calls together is right when they are independent reads, like stock checks. Be careful with calls that change things. Two reservations against the same shelf can race. In this shop only reads come in parallel, and the next issue adds a safeguard for the actions that matter. A slow tool still needs a timeout in a real system, and the step limit still applies to the whole run.

## Your work in this issue

Write `runToolCalls` in `src/parallel.ts`: first make the calls run at the same time, then make sure the results come back in call order and matched by id. Then switch `runAgent` in `src/agent.ts` from its inner loop to `runToolCalls`. `node src/demo.ts` times three scans of 60, 20 and 40 milliseconds, then a full stock check through Pip.
