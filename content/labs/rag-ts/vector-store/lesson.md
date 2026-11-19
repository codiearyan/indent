# A tiny vector store

## What you will be able to do

You can chunk the handbook and you can compare texts. Now you will put the two together into the piece every retrieval system has at its centre: a vector store. By the end of this issue you will be able to:

- explain what a vector store keeps and why it embeds documents only once
- build an index of chunks and their vectors
- search it for the top k chunks for a question
- refuse to return weak matches with a minimum score

## The next request

> **Bram:** The ranking demo was great, but it embedded every article again for each question. On a Saturday in July we answer a question every minute. Can the box remember the handbook and only work out the question?

He is right. The handbook changes a few times a season. Questions arrive all day.

## What a vector store keeps

A vector store is a list of entries, each a chunk together with its vector. You build it once, when the documents change, by embedding every chunk. After that, a search only has to embed the question and compare it with vectors that are already there.

Real vector stores add clever indexes so a search does not have to look at millions of vectors one by one. With 29 chunks a plain array and a loop are the right tool, and they make every step visible. The shape stays the same at any size: entries in, scored hits out.

Keeping the whole chunk in the entry, not just its text, pays off later. The id, source and position travel with every hit, so an answer can say exactly where it came from.

## Searching for the top k

A search does four things:

1. embed the question, in one request
2. score every entry with cosine similarity
3. sort from the highest score to the lowest
4. keep the first `k`

`k` is how many chunks you hand to the next step. Too few and you miss facts that live in a second chunk. Too many and you bury the answer in noise, and pay for every extra token you send to the model.

One trap: JavaScript's `sort` reorders the array you call it on. Sorting the index itself would quietly change the store between searches. Build a new array of hits and sort that.

## The minimum score

Top k has a flaw. It always returns `k` chunks, however bad they are. Ask the handbook about surfboards and it will still return three chunks, simply the least unrelated ones.

```ts
const hits = [
  { id: 'weather#1', score: 0.096 },
  { id: 'cancellations#1', score: 0.087 }
]
hits.every((hit) => hit.score < 0.2) // true: nothing here is really about the question
```

A minimum score, or cut-off, fixes this: hits below it are dropped, even if that leaves none. An empty result is useful information. It lets the next issue say "the handbook does not cover that" instead of making up an answer from irrelevant text.

There is no universal right value. It depends on the embedding model and on how your questions are worded. For this handbook and the local model, real questions score their best chunk above 0.2 and unrelated ones stay below it, which you can see in the demo. The last issue shows how to choose such numbers with measurements instead of guesses.

## Try it

Run the demo:

```
node src/demo.ts
```

It indexes the handbook at chunk size 200 with overlap 40, then asks three questions twice: once with no cut-off and once with a cut-off of 0.2. Look at the scores. The dog question has one strong hit and two weak ones. The surfboard question has only weak ones, and with the cut-off it finds nothing at all, which is the honest answer.
