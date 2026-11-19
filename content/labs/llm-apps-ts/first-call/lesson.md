# Your first model call

## What you will be able to do

Fernhollow is a small plant shop by the canal, run by Odile Brandt. Customers write in all day with care questions: why is my fern going brown, how often do I water a cactus. Odile wants an assistant called Moss to answer the easy ones, and you are the developer who will build it. By the end of this chapter you will be able to:

- describe a conversation as a list of messages with roles
- send a chat completion request with the OpenAI client
- read the reply text, the reason the model stopped, and how many tokens the call used

## The message from Odile

> **Odile:** Ravi and I answer the same twenty questions every week. Could Moss take the plain ones? Start small: one question in, one answer out. I just want to see it talk.

That is the whole job for today. One question, one answer, and enough information about the call to know whether the answer is complete.

## Messages and roles

A chat model does not take a single string. It takes a list of messages, and each message has a role:

- `system`: instructions about who the model is and how it should answer. The customer never sees it.
- `user`: what the person typed.
- `assistant`: what the model said earlier. You will use this role in later chapters.

The model reads the whole list from top to bottom and writes the next assistant message. Putting the system message first is a convention every provider follows, and it is how Moss learns its own name and tone.

## Sending a request

The OpenAI client reads its address and key from the environment, so `new OpenAI()` is enough. In this lab the address points at an offline lab model on your machine, so every answer is free and the same each time.

```ts
import OpenAI from 'openai'

const client = new OpenAI()
const res = await client.chat.completions.create({
  model: 'llmapps-care-1',
  messages: [{ role: 'user', content: 'Can a cactus live in a bathroom?' }]
})
console.log(JSON.stringify(res, null, 2))
```

Run something like this once and read the whole response. You will find an `id`, a `model`, a `choices` array and a `usage` object. The answer itself is inside the first choice, in `message.content`. A request can ask for several choices, which is why it is an array, but you will always ask for one.

Notice that this sample has no system message, so the model answers without knowing it is Moss. Your version will fix that.

## Why the model stopped

Every choice has a `finish_reason`. The two you will meet most are:

- `stop`: the model finished its answer.
- `length`: the model hit the `max_tokens` limit you set and was cut off mid-thought.

A cut reply still arrives with status 200 and a normal string. Only `finish_reason` tells you it is incomplete, so code that shows answers to customers should always look at it.

## Counting tokens

Models read and write tokens, which are pieces of words. The lab model counts a word or a punctuation mark as one token. The `usage` object reports three numbers:

- `prompt_tokens`: what you sent
- `completion_tokens`: what the model wrote
- `total_tokens`: the sum

Providers bill by these numbers, and they have limits on them, so they are worth logging from the very first call.

## Your tasks

Everything happens in `src/ask.ts`:

1. `buildMessages` returns the system message and the user's question.
2. `ask` sends them and returns the reply text.
3. `askWithDetails` sets `max_tokens` and returns the text, the finish reason and the token counts.

Each function takes an optional `client`. Always use the one you are given: the checks pass in a fake client to see exactly what you send. Run `node src/demo.ts` after each step to watch Moss come to life.
