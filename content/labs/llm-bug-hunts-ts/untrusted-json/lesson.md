# The JSON that was almost JSON

## What you will be able to do

Customers can now ask Kes to change a delivery in plain words, and Kes turns the message into a request the depot system understands. After this chapter you will be able to:

- explain why "reply with JSON only" in a prompt is a wish, not a guarantee
- reproduce a crash caused by a reply that is almost JSON
- extract, parse and validate model output so bad replies become handled failures
- write a test that catches a fix which parses safely but still trusts the content

## The ticket

Tomas Reyes, the CTO, drops this in the team channel after lunch.

> **Tomas:** Two things from the depot this morning. The change-request endpoint threw 500s for about an hour, and one parcel got rescheduled with a tracking id of `null`. The depot system did not love that. KES-231 is yours. Prompt says JSON only, so I am curious how this happened.

The error tracker has a cluster of these:

```
2026-11-18T11:02:44Z POST /delivery-change 500
SyntaxError: Unexpected token '`', "```json
{
"... is not valid JSON
    at JSON.parse (<anonymous>)
    at parseRequest (src/parse.ts:31:26)
2026-11-18T11:05:10Z POST /delivery-change 200 action=reschedule trackingId=null
```

## The idea: model output is untrusted input

A language model produces text. When you ask for JSON, you usually get JSON, but a model can also:

- wrap it in a markdown code fence, because that is how JSON often appears in its training data
- add a friendly sentence before it
- return valid JSON with the wrong shape, such as a missing field or a value outside your list
- not return JSON at all, when the message has nothing to extract

Treat the reply the way you treat a form a stranger filled in. The fix has two layers:

```ts
const value = extractJson(reply) // find the object, parse it, never throw
if (!isDeliveryRequest(value)) return { ok: false, reason: '...' } // check every field
```

A type assertion like `JSON.parse(text) as DeliveryRequest` does none of this. It only tells the compiler to stop asking. At runtime the object can be anything.

Interviewers ask about this because it is the most common way LLM features fail in production: not with a wrong answer, but with a right answer in an unexpected format.

## How to reproduce it

Open `src/parse.ts`. `parseRequest` sends the customer message, then passes the reply straight to `JSON.parse` and casts the result.

Run the demo:

```
node src/demo.ts
```

It tries every message in `src/messages.ts`. Some come back as errors, and some come back as `ok: true` with values that should never reach the depot. In `src/reproduce.ts`, pick a message that crashes the parser, catch the error and return both. That pair is the minimal reproduction you would paste into the ticket.

## How to fix it

Work in two steps inside `parse.ts`:

1. **Extract and parse safely.** Find the JSON object inside the text, even with a fence or a sentence around it. Parse it inside a `try`/`catch`. If there is no object or it does not parse, return `{ ok: false, reason }`.
2. **Validate the shape.** `action` must be one of `reschedule`, `redirect`, `cancel`. `trackingId` must be a string that looks like `KP-` followed by 5 digits. Anything else is `{ ok: false, reason }`.

Only a value that passes both steps becomes `{ ok: true, request }`. The function should never throw because of what the model wrote.

## How to test it

The tempting half fix is to add a `try`/`catch` and stop there. The 500s go away, so it feels done, but the `null` tracking id still reaches the depot.

Write tests in `src/parse.test.ts` that cover:

- a fenced reply and a chatty reply both parse
- a message with no request resolves to `ok: false` and does not throw
- a missing tracking id and an unsupported action both resolve to `ok: false`

Run them with `npx vitest run src/parse.test.ts`. The check runs them beside the original code, a correct fix and the try/catch-only fix, and expects fail, pass, fail.
