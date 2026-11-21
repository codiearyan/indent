# Ask before you refund

## What you will be able to do

Pip looks things up, recovers from mistakes and works in parallel. Now it gets a tool that moves money. By the end of this issue you will be able to:

- mark tools that must not run without a person's approval
- hold those calls until a confirm callback says yes, and pass a refusal back to the model
- record a trace of every step of a run
- write a test that proves the guardrail holds, using the trace and the real side effect

## The request from Felix

Felix Amari owns Pebble Lane Pantry, and he has read the plan for Pip's newest tool.

> **Felix:** Customers whose eggs arrive broken should get their money back fast, so yes, let Pip issue refunds. But no refund leaves this shop unless one of us clicks yes. And when something goes wrong, I want to see exactly what Pip did, step by step.

Two requirements: a human in the loop for risky actions, and a record you can inspect.

## Guarded tools

Most tools only read. A few act: they send money, cancel an order, email a customer. Mark those in the registry with a flag such as `needsConfirmation`. Before running one, call a confirm function with the tool name and its parsed arguments, and wait for the answer. In the staff app that function opens a dialog. In tests it is a one-line callback.

The order matters. Check the arguments first, because asking a person to approve a call that cannot run wastes their attention. Then ask. Only then act. A guard that runs the tool and asks afterwards looks fine in logs and still sends the money.

Here is the shape of a guard for a different action, sending a voucher email:

```ts
async function sendVoucher(email: string, approve: (what: string) => Promise<boolean>) {
  if (!(await approve(`Email a voucher to ${email}?`))) {
    return { refused: true, reason: 'Not approved by staff' }
  }
  return mailer.send(email, 'voucher')
}
```

Note the `await`. A confirm that returns a promise is truthy before anyone has clicked anything.

## A refusal is a result

When the answer is no, the model still asked a question and still needs an answer. Send a tool message that says the call was refused, with a reason. The model then explains this to the person instead of guessing or trying again blindly. The local model reads `refused: true` and replies that the refund was not approved.

The safe default for the confirm callback is to refuse. If someone forgets to wire it up, nothing risky happens.

## A trace you can assert on

A trace is a list of plain objects, one per event, in the order they happened: each model reply with its tool call ids, each tool call with its raw arguments, and then its result or its refusal. It is simple to build. Push an entry at each point in the loop where something happens. It pays off three ways: you can print it when debugging, store it for an audit, and compare it in tests.

Running guarded calls one at a time keeps the trace easy to read and means a person is never asked two questions at once. For a mix of reads and actions you could run the reads in parallel as in the last issue, but keep the trace order fixed.

## Testing the guardrail

A good test for this guardrail checks two different things, because each catches a different bug. The ledger of refunds shows whether money moved, which catches a guard that acts before asking. The trace shows whether the refusal was recorded as a refusal, which catches an agent that hides it. A test that checks only one of them can be fooled.

## Your work in this issue

Write `guardedCall` in `src/guard.ts`, then `runAgent` with its trace in `src/agent.ts`, then the test in `src/agent.test.ts`. `src/trace.ts` defines the trace entries and the confirm callback. Run `node src/demo.ts`, answer the approval question, and read the trace it prints.
