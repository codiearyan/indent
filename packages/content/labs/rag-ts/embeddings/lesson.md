# Embeddings and similarity

## What you will be able to do

The handbook is now in chunks. Next, the answer box needs a way to tell which chunk is closest to a question. By the end of this issue you will be able to:

- explain what an embedding is and what the numbers in it mean
- call an embeddings endpoint with many texts in one request, in batches
- compute cosine similarity by hand and say why it ignores length
- rank texts against a question

## The next request

> **Noor:** Bram tried a plain text search on the handbook. "Can my dog come?" found nothing, because the article says "dogs", and "Are dogs allowed in kayaks?" found every article that says "kayak". Can we compare meaning instead of exact strings?

Comparing meaning is what embeddings are for.

## What an embedding is

An embedding model turns a text into a list of numbers, a vector. Texts about the same thing get vectors that point in similar directions, so closeness between vectors stands in for closeness in meaning. Real embedding models learn this from huge amounts of text, which is how they know that "hound" and "dog" are related.

The local model behind `rag-embed-1` is much simpler, so you can see exactly what happens. It hashes each meaningful word into one of 1024 slots and counts it there, then scales the vector to length 1. Two texts are similar when they share words. It does not know synonyms, so it rewards questions that use the handbook's own words. That is enough to learn every idea in this repo, and it means scores are exact and repeatable.

## Calling the endpoint in batches

The endpoint takes a single string or an array of strings, and answers with one item per input:

```ts
const res = await client.embeddings.create({ model: 'rag-embed-1', input: ['dock hut', 'tow line'] })
res.data[1].index      // 1
res.data[1].embedding  // number[] with 1024 entries
```

Sending many texts in one request is much faster than one request per text: one round trip instead of dozens. Providers cap how many inputs a request may carry, so real code sends batches of a fixed size. Here the cap is `MAX_BATCH`, 16.

Each item carries an `index` that says which input it belongs to. Use it to put the vector in the right place. It costs one line and protects you from any client, proxy or provider that returns items in a different order.

## Cosine similarity

To compare two vectors, look at the angle between them rather than at how long they are. Cosine similarity does exactly that:

- multiply the vectors entry by entry and add it up: the dot product
- divide by the length of each vector (the square root of the sum of its squares)

The result is 1 when they point the same way, 0 when they share nothing, and -1 when they point in opposite directions. Dividing by the lengths matters: without it, a long text with many words would score higher simply because its vector is bigger.

The local model already scales its vectors to length 1, so here the dot product alone happens to give the same number. Write the full formula anyway. Your code should not depend on a promise the next model might not keep, and the check uses vectors of other lengths.

A zero vector has no direction. A text made only of words like "the" and "of" embeds to all zeros, so return 0 instead of dividing by zero and getting `NaN`.

## Ranking

Once you can embed and compare, ranking is short: embed the question together with the texts in one call, score each text against the question's vector, and sort from the highest score to the lowest.

Run the demo:

```
node src/demo.ts
```

It shows the non-zero numbers in three small vectors, compares them, and ranks every handbook article for a question about dogs. "Paddling with dogs" should come first, with a clear gap to the next article.
