# Steering with a system prompt and examples

## What you will be able to do

Moss can answer care questions now, and Odile is pleased. The next request comes from Ravi Quayle, who reads the shop inbox every morning. By the end of this issue you will be able to:

- write a system message that fixes the model's role and the shape of its reply
- add worked examples to a conversation so the model copies a format exactly
- parse a reply strictly and reject anything your code cannot trust

## The message from Ravi

> **Ravi:** The inbox is a mess. Pests, late orders, people asking about light, all mixed together. If Moss could put a label on each message, with the plant and how urgent it is, I could sort my morning in five minutes instead of an hour.

Ravi's inbox view is code, not a person. Code needs the reply in the same shape every time.

## A reply your code can rely on

Ask a model "what is this message about?" and you get a friendly sentence. That is fine for a person and useless for a program. Try it: once `labelMessage` sends its request, run `node src/demo.ts` while `LABEL_PROMPT` is still empty. The local model answers like a helpful colleague, in prose, and your function has nothing it can use.

The fix is to tell the model, before anything else, what job it has and exactly what to send back. That is what the system message is for. A good system message for a classifier does three things:

- says who the model is and what it is doing
- lists the allowed answers, word for word
- says to reply with only the answer, nothing around it

The local model behaves like a careful real one here: it switches to bare answers only when the instructions are that explicit.

## Show, do not only tell

Some formats are hard to describe in words. "Lowercase keys separated by a bar with spaces around it" is easy to get slightly wrong. A worked example is clearer. You add it to the conversation as if the model had already answered once:

```ts
const messages = [
  { role: 'system', content: 'You turn plant names into shelf codes.' },
  { role: 'user', content: 'Peace lily, large' },
  { role: 'assistant', content: 'PL-L' },
  { role: 'user', content: 'Monstera, small' }
]
```

The model sees an earlier question and its own answer, and continues the pattern. Two or three examples are usually enough. Pick examples that differ from each other, so the model learns the format and not one particular answer. The local model copies the keys and separators of the most recent example reply, which is why one sloppy example can break every answer after it.

## Trust, then verify

Even a well steered model can drift. A real model may add a full stop, capitalize a word, or slip back into prose for an odd message. Your code is the last line of defense, so parse strictly:

- clean up what is harmless, like surrounding spaces
- match the whole reply against the format, from start to end
- throw a clear error when it does not match

Throwing feels harsh, but the alternative is worse. A guessed label quietly puts an urgent message about a dying plant at the bottom of Ravi's list.

## Your tasks

Everything happens in `src/inbox.ts`:

1. `LABEL_PROMPT` and `labelMessage`: a system prompt that asks for one bare label, and a function that returns it or throws.
2. `TRIAGE_PROMPT` and `buildTriageMessages`: a system message, at least two worked examples and the customer's text.
3. `triage`: send those messages and parse the triage line into an object, throwing on anything else.

Run `node src/demo.ts` after each step and watch the replies change shape as your prompts improve.
