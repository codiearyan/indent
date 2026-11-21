# Answers that change between runs

## What you will be able to do

So far every eval at Pebblebrook Plants gave the same answer each time you ran it. Real models do not always do that. With sampling turned on, the same ticket can land in a different queue on Tuesday than on Monday. By the end of this issue you will be able to:

- run each case several times with a seed per run, so every result can be reproduced
- give each case a pass rate and a clear status: stable pass, stable fail or flaky
- report flaky cases by name instead of letting an average hide them

## The ticket

> **Ines Varga (support lead):** Something odd. A customer wrote in twice about the same cracked pot. The first email went to refunds, the second to plant care. Same words. Is triage broken?
>
> **Dev Okafor (engineer):** We moved to v3 last week, and it samples. Our eval said 100% on that ticket. I ran it once.

One run of a sampling model is one draw. It tells you what can happen, not what usually happens.

## Seeds make randomness repeatable

The local model `evals-triage-v3` takes a `seed` in the request. For a given seed and input it always gives the same answer, but different seeds can give different answers on tickets that sit between two queues. A pot that arrived cracked with soil everywhere is both a refund and, if you squint, plant care.

Seeds turn "it sometimes fails" into "it fails on seed 4", which anyone on the team can rerun and look at. That is why every run in your report keeps its seed.

## Three kinds of case

Run a case five times and you get one of three pictures:

- **stable pass**: all five passed. You can trust this case.
- **stable fail**: none passed. A real, repeatable bug, just like in earlier issues.
- **flaky**: some passed, some failed. The model is unsure, and customers will see both answers.

Flaky does not mean "mostly fine". A case that fails one run in five sends one customer in five to the wrong queue. Do not round it up with a threshold.

## Averages hide flakiness

Here is the trap. Suppose four cases pass every time and four pass half the time. The mean pass rate is 75%, which looks like "a decent model with some misses". It hides that half of your cases are coin flips.

So report two numbers, and the list of flaky ids:

```ts
const rates = [1, 1, 0.5, 0.5]
const mean = rates.reduce((a, b) => a + b, 0) / rates.length // 0.75
const stable = rates.filter((r) => r === 1).length / rates.length // 0.5
```

The mean answers "how often is a random answer right". The stable pass rate answers "on how many tickets can we rely on it". The flaky list answers "which tickets do I read first".

## How many runs?

More runs catch rarer flakiness and cost more requests. One run cannot show flakiness at all, so the report refuses fewer than two. Five is a sensible default for a small set; raise it for the cases that matter most. Use the same seeds, 1 to `runs`, for every case and every model, so two reports can be compared case by case like in the last issue.

## Try it

Run `node src/run.ts 5`. Look at the gap between the mean pass rate and the stable pass rate, then at the flaky list. Pick one flaky case and one of its failing seeds and call `triage` with that seed yourself: you should get the wrong queue every time. Then try `node src/run.ts 1` and read why the report refuses.
