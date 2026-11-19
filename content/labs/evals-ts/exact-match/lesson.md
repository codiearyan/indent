# A test set and a pass rate

## What you will be able to do

Pebblebrook Plants sells houseplants online, and every support email goes through a small language model feature called triage. It reads the ticket and picks one queue: `shipping`, `refund`, `plant-care`, `account` or `other`. You are the developer who has to say whether a change to that feature is safe. By the end of this chapter you will be able to:

- keep a test set in a file and load it with clear errors when it is broken
- compare a model's label to the expected one without being fooled by formatting
- run the feature over every case and report a pass rate and the failures

## The ticket

> **Ines Varga (support lead):** Dev wants to move triage to a new model version. Last time we changed the prompt, refund emails sat in the plant-care queue for a week before anyone noticed. Before we touch it again, can you tell me how good the current version actually is? A number, please, not a feeling.

Right now the team checks triage by pasting three or four tickets into a script and reading the answers. That is a demo, not a measurement. Change the tickets and you get a different impression.

## The idea: an eval is a test suite for behavior

An eval has three parts:

1. **A test set**: fixed inputs, each with the answer you expect. It lives in a file, under version control, so everyone measures against the same thing.
2. **A scorer**: a function that says whether one output is right.
3. **A report**: how many cases passed, and which ones failed.

The pass rate tells you where you stand. The list of failures tells you what to look at. You need both: a rate without failures cannot be acted on, and failures without a rate cannot be compared between versions.

## Loading cases you can trust

The test set is a JSON Lines file: one JSON object per line. It is easy to append to and easy to review in a diff. It is also easy to break with a missing comma, and a loader that silently skips a bad line makes your pass rate quietly wrong.

So the loader should be strict. Blank lines are fine to skip. A line that is not valid JSON, or that has no `expected` value, should stop the run with the line number in the message. A duplicate id should stop it too, because later you will key results by id, and two cases with the same id would overwrite each other.

## Exact match, after normalizing

For a classifier, the simplest scorer is exact match: the reply must equal the expected label. But models are loose about formatting. The same answer can come back as `Refund`, `refund.` or `Category: Refund`. Counting those as failures measures formatting, not judgment.

The fix is to normalize both sides before comparing. Normalizing should only strip noise you have seen in real replies. It should never change the meaning:

```ts
const squash = (s: string): string => s.trim().replace(/\s+/g, ' ')

squash('  late   parcel ') === 'late parcel' // true
squash('not late') === 'late'               // false, and it should stay false
```

That is also why `includes` is the wrong comparison. A reply of `not a refund` contains `refund`, and it is wrong.

## The report

Your report is a plain object: the model name, the total, the number passed, the pass rate and the failures. Keep the failures in case order and include what the model actually said after normalizing. When the rate drops, the failures are where you start reading.

Two details matter. Use the model name you are given, because next you will run the same set against other models. And guard the pass rate when the set is empty: `0 / 0` is `NaN`, and `NaN` in a dashboard helps nobody.

## Try it

Run `node src/run.ts evals-triage-v1` once your three functions work. Then run it again with `evals-triage-v2`, the version Dev wants to ship. Look at the two lists of failures, not just the two numbers. You will come back to that difference in a later chapter.
