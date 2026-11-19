# The conversation that ate itself

## What you will be able to do

Kes now holds real conversations on the Kestrel Parcels website, remembering what the customer said earlier in the chat. After this chapter you will be able to:

- explain what a context window is and why chat history counts against it
- reproduce the moment a growing conversation stops working
- trim history to a fixed budget while keeping the system prompt
- write a test that catches a trim that throws away the wrong message

## The ticket

On Friday afternoon Mira forwards a screenshot with a short note.

> **Mira:** A customer chatting with Kes about a late parcel got nine answers and then "Something went wrong" on every message after that. She refreshed and it worked again, then broke again after a while. Looks like long chats just die? Logged as KES-247.

The API log for that session:

```
2026-11-20T15:41:02Z chat session=s_4410 turn=8 messages=17 prompt_tokens=372 status=200
2026-11-20T15:41:19Z chat session=s_4410 turn=9 messages=18 status=400
  error.code=context_length_exceeded
  error.message="This model's maximum context length is 400 tokens, but your messages used 406 tokens."
```

## The idea: the model only sees what you send it

A chat model has no memory between requests. It feels like a conversation because your code resends the whole history every time: the system prompt, every question and every answer. Each turn the request grows.

Every model has a context window, a maximum number of tokens it accepts per request. Once the history is larger than that window, every request fails until the history shrinks. Real windows are far larger than the lab model's 400 tokens, but real conversations, documents and tool results are larger too, and the cost of each request grows with its size long before the hard limit.

The usual fix is a sliding window: keep the instructions, drop the oldest turns.

```ts
const [system, ...rest] = history
const trimmed = [system, ...rest.slice(-8)]
```

The first line matters as much as the second. The system prompt holds the assistant's role and rules. Lose it and the model still answers, just not as your product.

## How to reproduce it

Open `src/chat.ts`. `ChatSession.send` appends the question, sends the full `history`, then appends the reply. Nothing ever removes a message.

Run the demo:

```
node src/demo.ts
```

The count of kept messages climbs by two each turn, and around turn 9 every send fails with a 400. In `src/reproduce.ts`, send the questions from `src/questions.ts` until `send` throws, then return which turn failed and the error message. That turn number is what you would put in the ticket. Once you fix `chat.ts`, the conversation stops failing, so the demo will report that it never failed. The check always runs your reproduction against the original file.

## How to fix it

The team's policy for chat history:

1. `history[0]` is always the system prompt.
2. After it, keep at most `MAX_RECENT_MESSAGES` messages, the newest ones.
3. Apply the rule to what you send, and keep `history` within it after each reply.
4. Leave short conversations alone.

Trimming by message count is the simplest version. Production systems often trim by token count, or summarize old turns into a single message, but the shape of the fix is the same: a budget, applied every turn, that never touches the instructions.

## How to test it

The tempting wrong fix is `history.slice(-8)` on the whole array. Requests stop failing, so a test that only checks for errors passes. But the system prompt was the oldest message, so it is the first one to go, and Kes quietly stops being Kes.

Write tests in `src/chat.test.ts` that check:

- one session answers all 30 questions without an error
- after those 30 questions the last reply still starts with `Kes here.` and `history[0]` is still the system prompt

Run them with `npx vitest run src/chat.test.ts`. The check runs them beside the original code, a correct fix and the slice-everything fix, and expects fail, pass, fail.
