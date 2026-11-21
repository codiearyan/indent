# Cutting the handbook into chunks

## What you will be able to do

Saltmarsh Paddle Co. hires kayaks and canoes from a small quay on the harbour. Every summer the front desk answers the same questions hundreds of times: what the deposit is, whether dogs can come, what happens when the wind picks up. The answers are all in the staff handbook, but nobody has time to search it with a queue at the hut.

Noor Halloran, the owner, has hired you to build an answer box that finds the right part of the handbook and answers from it. By the end of this issue you will be able to:

- explain why retrieval works on chunks rather than whole documents
- split text into chunks of a maximum size without cutting words
- overlap neighbouring chunks so a fact on a boundary is not lost
- keep the source and position of every chunk

## The message from the desk

> **Bram (front desk lead):** The handbook is eleven short articles in `src/handbook.ts`. Some answers are one sentence buried in the middle of an article. If your box hands me a whole article I still have to read it, and the model will too.

That is the first idea of retrieval: you search small pieces, so that the piece you find is mostly about the question.

## Why chunks

Retrieval compares a question with each piece of text and keeps the closest ones. If a piece is a whole article, it talks about many things, and the one sentence you need is diluted by everything around it. If a piece is a single word, it has lost its meaning. Chunks sit in between: a few sentences, small enough to be about one thing, large enough to make sense on their own.

Size is measured here in characters. Real systems often count tokens instead; the idea is the same.

## Cutting without breaking words

The quickest way to cut text is by character position, and it is wrong:

```ts
const text = 'Trips are paused when the wind is above 20 knots.'
console.log(text.slice(0, 20)) // 'Trips are paused whe'
```

Half a word is noise. It will not match the question "when", and it makes the chunk harder to read for the model later. So you will build chunks from whole words: split the text on whitespace, then add words to the current chunk while it still fits in the size limit. A word that is longer than the limit on its own still becomes a chunk, because cutting it is worse than a slightly long chunk.

## Overlap

Facts do not respect chunk boundaries. If "the booking gets a full refund" ends one chunk and "or a free move to another day" starts the next, neither chunk holds the whole rule.

Overlap fixes this cheaply. Each new chunk starts by repeating the last few words of the previous chunk, up to `overlap` characters. A sentence cut at the boundary now appears whole, or nearly whole, in one of the two chunks. The price is a little duplicated text, so overlap is usually a small fraction of the chunk size.

Two rules keep it safe:

- the carried words never make up the whole previous chunk, so the loop always moves forward
- `overlap` must be smaller than `size`, and nonsense settings throw an error instead of looping forever

## Knowing where a chunk came from

A chunk on its own is just text. Later issues need to say which article an answer came from and to measure whether the right article was found. So every chunk keeps:

- `source`: the id of its document, such as `weather`
- `index`: its position inside that document, starting at 0
- `id`: the two together, such as `weather#2`, unique across the handbook

## Try it

Run the demo in the terminal:

```
node src/demo.ts
```

It prints the weather article cut at 80 characters, then at 80 with 20 of overlap, then the first chunks of the whole handbook and how many chunks each article became. Compare the 80 and 80/20 outputs: the second has more chunks, and each one begins where the last one was ending.
