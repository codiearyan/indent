# Summaries that stop mid-sentence

## What you will be able to do

Kestrel Parcels is a same-day courier with a support assistant called Kes. Kes runs on a language model, and you are the newest developer on the team. By the end of this chapter you will be able to:

- explain what `finish_reason` is and why every caller should read it
- reproduce a reply that was cut off by `max_tokens`
- recover from a cut-off reply with a bounded retry, and fail loudly when recovery is impossible
- write a test that tells a real fix apart from a lucky one

## The ticket

Your first morning starts with a message from Mira Okonkwo, who leads the support desk.

> **Mira:** Hey! Kes summaries keep ending in the middle of a thought. Agents open a ticket, read "I called your hotline twice and waited forty" and then nothing. Half my team now reads every complaint in full, which defeats the point. Can you take KES-214?

The service log for one of those summaries looks like this:

```
2026-11-18T09:14:07Z summarize complaint=c_88213 model=kes-summarize-1
2026-11-18T09:14:07Z   prompt_tokens=118 completion_tokens=48 max_tokens=48
2026-11-18T09:14:07Z   finish_reason=length
2026-11-18T09:14:07Z   saved summary (len=212) to ticket KES-214
```

No error, no warning. The summary was saved as if it were fine.

## The idea: a reply can end for more than one reason

A chat completion does not only return text. Each choice also says why the model stopped writing. The two values you will meet most:

- `stop`: the model reached a natural end.
- `length`: the model hit the `max_tokens` limit you set and was cut off.

A `length` reply is not an error from the API's point of view. The HTTP status is 200 and the content is a normal string. If your code only reads `message.content`, a cut-off reply looks exactly like a short one.

```ts
const res = await client.chat.completions.create({ model, max_tokens: 48, messages })
const choice = res.choices[0]
console.log(choice.finish_reason) // 'stop' or 'length'
```

The lab model behaves like a real one here. It counts tokens (roughly a word or a punctuation mark each), and when the full reply does not fit it stops there and reports `length`.

Raising the limit makes the bug rarer, not gone. Some inputs will always produce a reply longer than any fixed budget, and the cost of a reply grows with the tokens it uses. Interviewers like this bug because the honest fix is about checking a signal, not picking a bigger number.

## How to reproduce it

Look at `summarizeComplaint` in `src/summarize.ts`. It sends the complaint with `max_tokens: MAX_TOKENS` and returns `message.content` without asking how the reply ended.

Run the demo in the terminal:

```
node src/demo.ts
```

The summary of `longComplaint` stops halfway through point 4. Now make the bug visible in data, not just in prose: in `src/reproduce.ts`, call the model yourself with the same settings and return both the text and the `finish_reason`. Seeing `length` next to the cut text is the proof you attach to the ticket.

## How to fix it

The team agreed on a policy for this endpoint:

1. Read `finish_reason` on every reply.
2. If it is `length`, ask again with double the budget.
3. Stop after 3 requests in total.
4. If the last reply is still cut off, throw an error that says the summary was truncated.

The cap matters. Without it, one huge complaint could keep doubling the budget and the bill. Throwing at the end matters too: a clear error lets the caller show "summary unavailable" instead of a misleading half summary. Keep the optional `client` parameter, since tests use it to swap in a fake model.

## How to test it

A useful test fails on the bug and passes on the fix. A great test also fails on a fix that only looks right. Here, the tempting wrong fix is to raise `max_tokens` and move on. It makes the long complaint pass, so a test that only checks the long complaint would be fooled.

Write two tests in `src/summarize.test.ts`:

- the long complaint comes back as a complete summary
- the endless complaint makes `summarizeComplaint` reject with an error mentioning `truncated`

Run them with `npx vitest run src/summarize.test.ts`. The check will run your tests beside the original code, a correct fix and the raised-limit fix, and expects fail, pass, fail.
