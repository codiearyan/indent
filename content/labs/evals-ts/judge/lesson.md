# A model as the judge

## What you will be able to do

Pebblebrook Plants is testing a second feature: it drafts a reply to each ticket so an agent only has to check and send it. A draft is free text. No regex can tell you whether it is a good reply. By the end of this chapter you will be able to:

- grade free text by asking a judge model with a written rubric
- read the judge's verdict defensively, even when it wraps it in extra words
- return a clear "could not judge" result instead of a guess, and keep it out of the pass rate

## The ticket

> **Ines Varga (support lead):** The drafts look good when I skim them, but last week one of them told a customer their refund "has been issued". Refunds need a person to approve them. I wrote down the four rules every draft must follow. Can the eval check them for us?

Ines's rules are the rubric. They are in `src/tickets.ts`: mention the order number, apologize when there is a problem, never promise a refund, stay short.

## The idea: a rubric and a judge

A judge is a second model call. You send it the ticket, the draft and the rubric, and ask for a verdict in a fixed format. The prompt is already written for you in `src/judge-prompt.ts`. It asks for two lines:

```
VERDICT: PASS
REASON: the draft meets every rule
```

Judges are useful because they can read meaning. They are also models, so you treat their output exactly like any other model output: as untrusted text you must parse carefully.

## What the judge actually sends back

The lab judge follows the format most of the time. Sometimes it does not:

- `Sure, here is my assessment.` and then the verdict line
- `**Verdict:** pass` in markdown bold
- a paragraph that weighs the rules and never says pass or fail
- `I cannot pass judgment on the rule "..."`, when a rule is something it has no way to check

That last one is the trap. A parser that looks for the word "pass" anywhere would read it as a pass. So the parser only trusts a verdict label: the word "verdict" followed by pass or fail. If there is no label, or two labels disagree, the honest answer is "unknown".

## Unknown is a result, not a failure

When a test runner cannot run a test, it does not mark it passed. The same goes for a judge. An unknown verdict means "nobody checked this case", and it must be visible in the report:

```ts
type Outcome = 'pass' | 'fail' | 'unknown'
const judged = (outcomes: Outcome[]): number => outcomes.filter((o) => o !== 'unknown').length
```

Count unknowns separately and compute the pass rate over judged cases only. If many cases are unknown, the rate is resting on a small sample, and the unknown count is what tells you so.

## One retry, then stop

A rambling reply is often fixed by asking again, more firmly. Keep the conversation: the original messages, the judge's reply as an assistant message, and a short follow-up that asks for exactly one verdict line. That costs one extra request for the few unclear cases.

Do it once. If the second answer is still unclear, the judge cannot judge this case, and asking a third time only spends money. The same applies when the request itself fails: return unknown with the error in the reason, and let the run continue with the next draft.

## Try it

Run `node src/run.ts`. The first run uses Ines's rubric and should give you a mix of passes and fails, with a reason for each. The second run adds a rule the judge cannot check, "Sounds warm and friendly". Every case should come back unknown, and the pass rate should not pretend otherwise. That is your cue to rewrite the rule as something checkable.
