# Baseline against candidate

## What you will be able to do

You can now score one version of a feature. The real question at Pebblebrook Plants is always about two: the one running today and the one Dev wants to ship. By the end of this issue you will be able to:

- run the same test set against a baseline and a candidate
- sort every case into fixed, broken or unchanged
- apply a ship rule that a higher pass rate cannot talk its way around, and pin it down with tests

## The ticket

> **Dev Okafor (engineer):** v2 scores 89% on the triage set and v1 scores 67%. That is a huge jump. Can we switch today?
>
> **Ines Varga (support lead):** Which tickets does v2 get wrong that v1 got right? Because if it is refunds, I want to know before my team does.

Both of them are right to ask. Dev's number is real. Ines's question is the one the number cannot answer.

## Averages hide regressions

A pass rate is an average, and averages trade cases against each other. Suppose the candidate fixes six cases and breaks two. The rate goes up, and two kinds of tickets that used to work now fail. If those two are refund requests about damaged plants, the customers who are already upset are the ones who get routed to the wrong queue.

So compare case by case. For each id, look at the baseline result and the candidate result:

- failed before, passes now: **fixed**
- passed before, fails now: **broken**
- same as before: **unchanged**

The broken list is the most useful output of the whole eval. It is a short, concrete list of tickets to read before anyone decides anything.

## Match by id, never by position

Two runs over the same set do not have to list cases in the same order. Requests finish at different times, someone adds a case in the middle, someone sorts the file. Comparing the third result of one run with the third result of the other is a silent bug: the report looks fine and means nothing.

Index one run by id, walk the other, and treat a case that exists in only one run as an error. Comparing runs over different sets is not a comparison.

## A rule the team agrees on

Pebblebrook's rule is strict: **no case that passed before may break**. A candidate that breaks a passing case does not ship, whatever its rate. The team can still choose to ship it, but only after looking at the broken cases and deciding, on purpose, that the trade is worth it. Usually the better move is to fix the regression and run the comparison again.

The rule's output is a decision and its reasons. The reasons should name the broken cases so the person reading the report knows exactly where to look.

There is one more edge: a comparison with no cases. Nothing broke, but nothing was checked either. That is not evidence, so it does not ship.

## Test the rule, not just the code

Rules like this get "simplified" later. Someone will suggest "ship if the pass rate did not go down", and it will sound reasonable. Your tests are what stops that change. A good test for this rule uses a candidate whose rate goes up while one case breaks:

```ts
const before = { model: 'a', cases: [{ id: 'x', passed: true, got: '' }] }
const after = { model: 'b', cases: [{ id: 'x', passed: false, got: '' }] }
// a comparison built from these must never ship
```

The check runs your tests beside a rate-only rule. Only tests that include a trade like that will catch it.

## Try it

Run `node src/run.ts evals-triage-v1 evals-triage-v2` and read the broken list. Then open `src/cases.ts` and read those tickets. What do they have in common? Try `node src/run.ts evals-triage-v2 evals-triage-v2` too: nothing changes, and the rule says ship.
