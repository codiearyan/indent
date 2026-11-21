# Streaming

## What you will be able to do

Moss now answers care questions, sorts the inbox and fills in the order sheet. Odile wants customers to talk to Moss directly, in a chat window on the shop's website. By the end of this issue you will be able to:

- ask the model to stream its reply
- assemble the full text from the chunks as they arrive
- report partial text to the screen through a callback
- tell a finished stream from one that was cut or dropped

## The message from Odile

> **Odile:** I tried the chat window on my phone. I typed a question, nothing happened for a few seconds, and I thought it was broken. Then a whole paragraph appeared at once. Can it type like a person does?

A long answer can take several seconds to generate. Without streaming, the customer stares at an empty bubble for all of it. With streaming, the first words appear almost at once and the rest follow as the model writes them.

## What a stream looks like

Add `stream: true` to a request and the client stops returning one response. It returns an object you read with `for await`, and each item is a chunk:

```ts
const stream = await client.chat.completions.create({
  model: 'llmapps-care-1',
  stream: true,
  messages: [{ role: 'user', content: 'Does a pothos like bathrooms?' }]
})
for await (const chunk of stream) {
  console.log(JSON.stringify(chunk.choices))
}
```

Run something like this once. You will see a pattern:

- the first chunk sets the role and has empty content
- many chunks each carry a small `delta.content`, often one word
- one chunk near the end carries the `finish_reason` and no text
- some streams end with a chunk whose `choices` array is empty, carrying usage numbers

Notice the field is `delta`, not `message`. Each chunk holds only what is new.

## Assembling the text

The full reply is every `delta.content` joined in order. Code that reads chunks has to be forgiving about their shape: content may be missing or empty, and `choices` may be empty. A loop that reads `chunk.choices[0].delta.content` without checking will crash on the very last chunk of a perfectly good stream.

The finish reason matters as much as it did in the first issue. `stop` means the answer is complete and `length` means the token limit cut it. There is also a third case that only streams have: the connection drops and the chunks simply stop. No finish reason ever arrives. Treat that as an error, because the text you have is incomplete and nothing else will tell you.

## Reporting progress

The chat window needs to know about text as it arrives. The simplest way is a callback: a function the caller passes in, which you call each time the text grows. Give it the whole text so far, not only the new piece. The window can then redraw the bubble from one value, and a missed call never leaves a gap in the middle of a sentence.

Keep the collecting code separate from the request code. A function that takes any async iterable of chunks can be tested with a hand-made list, with no model at all. That is exactly how the checks test it.

## Your tasks

Everything happens in `src/stream.ts`:

1. `collectStream`: join the text, keep the finish reason, skip empty chunks, throw if the stream ended early.
2. `collectStream` with `onPartial`: report the text so far after each piece.
3. `streamAnswer`: request a stream from the model and collect it.

Run `node src/demo.ts` to watch Moss type its answers, including one that runs out of tokens.
