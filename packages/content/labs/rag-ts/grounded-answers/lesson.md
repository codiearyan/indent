# Answers with sources

## What you will be able to do

The store finds the right chunks. Now the answer box has to turn them into a reply a customer can read, without making anything up. By the end of this issue you will be able to:

- build a prompt that grounds the model in retrieved text
- number sources so the model can cite them, and turn citations back into chunks
- return an honest "not in the documents" result without calling the model

## The next request

> **Noor:** Last week a trial chatbot told a customer that dogs ride free in kayaks. They do not, and the handbook says so. Whatever we ship has to answer from the handbook, show where the answer came from, and admit when it does not know.

Those are the three parts of a grounded answer: the right context, citations, and a way to say no.

## Grounding the model

A chat model answers from what it learned in training unless you give it something better. Retrieval gives it something better: the chunks that match the question, pasted into the prompt. The system message sets the rules, and the user message carries the sources and the question.

The rules matter as much as the sources. Tell the model to answer only from the sources, to cite them, and to say it does not know when they do not contain the answer. Without that last rule a model will often fill the gap with something plausible, which is exactly what went wrong with the dogs.

## Numbered sources and citations

Give each chunk a short number in the prompt, `[1]`, `[2]`, `[3]`, and ask the model to put those numbers after what it uses. Short numbers are easy for a model to copy correctly, unlike long ids.

Citations then run the other way. The reply comes back as text, and your code finds every `[n]` in it to work out which chunks the answer used:

```ts
const reply = 'Rinse sandy dogs at the hose [3]. Bring a towel [3].'
const found = [...reply.matchAll(/\[(\d+)\]/g)].map((m) => m[1])
console.log(found) // ['3', '3']
```

Three details make this robust. A number can appear more than once, so keep each chunk once. A model can cite a number that does not exist, so ignore anything outside the list of hits. And `[n]` counts from 1, so it points at `hits[n - 1]`.

Returning the cited chunks, with their ids, lets the front desk check an answer in seconds and lets you measure later whether answers used the right parts of the handbook.

## The local chat model

`rag-chat-1` is an offline stand-in that behaves like a careful model. It reads the numbered lines and the `Question:` line from your prompt, picks the source sentences that share the most words with the question, and cites them. If no sentence shares enough words, it says it does not know. If the prompt holds no sources at all, it says it cannot answer.

Because it reads your prompt's format, a prompt that numbers the lines wrongly or drops the question gets a worse answer. That is true of real models too, only less predictably.

## Two ways to say no

There are two different "I do not know" cases, and a good answer box handles both.

- **Retrieval found nothing.** No chunk reaches the minimum score. There is nothing to ground an answer in, so do not call the model at all. Return a fixed `NOT_FOUND` result. It is faster, it costs nothing, and it cannot be talked into a guess.
- **Retrieval found something, but it does not answer the question.** A question about the cafe's opening time can match chunks that mention the quay. The model reads them, finds no answer, and says so. Your code passes that reply through with no sources.

## Try it

Run the demo:

```
node src/demo.ts
```

It prints the prompt for the dog question, then asks four questions. Expect a cited answer about canoes, an answer that cites two articles for the voucher question, a polite "I do not know" for the cafe, and, once you finish the last task, `NOT_FOUND` for surfboards without a chat request.
