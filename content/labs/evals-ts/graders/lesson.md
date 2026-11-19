# Graders that give partial credit

## What you will be able to do

Triage at Pebblebrook Plants has grown up. It no longer replies with a single word: it returns a JSON object with a category, an urgency from 1 to 5, the order id if the customer gave one, and a one line summary. Exact match cannot score that. By the end of this chapter you will be able to:

- write small grader functions that each check one property of an output
- combine graders per case and give partial credit
- explain every failure in words, so a low score tells you what to fix

## The ticket

> **Dev Okafor (engineer):** The JSON triage is live behind a flag. I tried exact match on the whole object and every case failed, because the summary is never word for word what I wrote. But some of these are clearly fine and some are clearly wrong. I need a score that can tell them apart.

Dev is right that exact match is the wrong tool here. The summary is free text, the urgency is a judgment call, and the order id is either right or wrong. Each field needs its own kind of check.

## The idea: one grader, one property

A grader is a function from the raw output to a verdict and a reason. Keep each one small and focused on a single property:

- **contains**: a string appears in the output, like an order id.
- **regex**: a pattern matches, like "the output starts with `{`".
- **field equals**: a JSON field has exactly one value, like `category` is `refund`.
- **numeric tolerance**: a number is close enough, like urgency 4 give or take 1.

Tolerance is how you encode "a judgment call". If one agent would say urgency 4 and another 5, a test that demands exactly 4 is measuring noise.

Graders are built by factories, so a case can say what it wants as data:

```ts
const longerThan = (n: number) => (output: string) =>
  output.length > n ? { pass: true, reason: '' } : { pass: false, reason: `only ${output.length} chars` }

const atLeastTen = longerThan(10)
atLeastTen('hi') // { pass: false, reason: 'only 2 chars' }
```

## Graders must not crash

The model will sometimes break the format: wrap the JSON in a code fence, or add a sentence in front of it. That is exactly what an eval is supposed to catch. If your field grader calls `JSON.parse` and lets it throw, the whole run stops and you learn nothing about the other cases.

So a JSON grader returns a failure with a reason that says the output was not a JSON object. And as a second line of defense, the code that runs graders catches anything a grader throws and records it as a failure too.

## Partial credit and reasons

With several graders per case, a case is no longer just pass or fail. If three of four checks pass, the score is 0.75. That number moves when a change makes things a little better or a little worse, long before a whole case flips.

Keep a strict `passed` flag next to the score, though. "Every check passed" is still the bar for calling a case done. And collect the reasons of the failing graders in order. A report that says `category is "other", expected "refund"` saves someone from opening the raw output to find out.

One more rule: a case with no graders always passes. Treat an empty list as a mistake and throw.

## Checks as data

Writing graders inline in code makes every new case a code change. Instead, each case in `src/cases.ts` lists its checks as plain objects, and `buildGrader` turns each one into a grader. Unknown kinds should throw with the kind in the message, because a typo like `kind: 'feild'` should fail loudly, not be skipped.

## Try it

Run `node src/run.ts`. You should see a mean score, how many cases fully passed, and every failing reason. Find the case where the model fenced its JSON and look at what each grader said about it: the `contains` check still passes, the field checks fail, and nothing crashed.
