# Measuring retrieval

## What you will be able to do

The answer box works. The question now is how well, and whether a change makes it better or worse. By the end of this issue you will be able to:

- build a small labelled set of questions for your own documents
- compute hit rate and recall at k
- run a whole retrieval setup against the labelled set
- use the numbers to find and fix a bad setting

## The next request

> **Bram:** I tidied the settings before the season opened. Chunk size 20 felt right; the handbook sentences are short. Since then the box misses things it used to get, like the group discount. Is it me, or the box?

Trying a few questions by hand cannot settle that. A handful of good answers proves nothing about the next fifty. You need a measurement you can repeat after every change.

## A labelled set

A labelled set is a list of realistic questions, each with the documents that answer it. `src/labelled.ts` holds 21 of them, taken from last summer's front desk log. Most need one article. A few need two: a refund because of weather needs both the weather article and the cancellation article.

Labels name articles, not chunks. Chunk ids change every time you change the chunk size, but the article that answers a question does not. That is what makes the set reusable while you experiment.

Twenty questions is small, but it is far better than none. Real teams grow the set from questions that went wrong, so every bug becomes a test.

## Hit rate and recall at k

Both metrics look only at the top `k` results, because that is all the model will ever see.

- **Hit rate at k**: the share of questions where at least one right article is in the top k. It answers "did we find anything useful?"
- **Recall at k**: for each question, the share of its right articles found in the top k, averaged over questions. It answers "did we find everything needed?"

They differ on questions that need two articles. Finding one of two is a hit, but only half the recall.

```ts
const result = { expected: ['weather', 'cancellations'], retrieved: ['weather', 'weather', 'booking'] }
// hit at 3: yes, 'weather' is there. Recall at 3: 1 of 2 articles, so 0.5
```

Notice the repeated `weather`. Several chunks of one article can rank high. An article found twice still counts once, or recall could climb above 1.

## Running the whole setup

To evaluate one group of settings, rebuild everything the way the answer box would: chunk the handbook, index the chunks, search each question, and keep the article id of each hit. Then compute both metrics. Searching without a minimum score here measures the ranking itself. The cut-off is a separate decision you can tune once the ranking is right.

Keep `evaluate` a pure function of its settings. Then the sweep script can call it for a whole grid of chunk sizes and values of k, and you can compare them side by side.

## Reading the numbers

Run the sweep:

```
node src/sweep.ts
```

The first line measures `config.ts`. Below it, a grid shows hit rate and recall for other chunk sizes at k from 1 to 3. Read it like a map. Where do both numbers reach 100%? Which setting in `config.ts` is outside that region?

Then think about why. A 20 character chunk holds three or four words. Each chunk scores well on whatever words it happens to contain, so short fragments that share one word with a question crowd out the chunk that really answers it. Too large a chunk has the opposite problem: one chunk talks about many things and its score is diluted.

Change the bad setting, run the sweep again, and confirm the numbers, rather than trusting your instinct. The team limits still apply: k stays at 3 or below, because the prompt only has room for three passages, and chunks stay at 500 characters or less.
