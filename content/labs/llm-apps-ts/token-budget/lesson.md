# A conversation with a token budget

## What you will be able to do

Customers love the chat window. Some of them love it a little too much: they keep chatting for half an hour about every plant they own. By the end of this chapter you will be able to:

- keep a conversation's history so the model remembers earlier turns
- count the tokens a request will carry before you send it
- trim the oldest turns so every request stays under a budget
- make sure the system message survives every trim

## The message from Ravi

> **Ravi:** Two things from the chat logs. First, Moss forgets what people said one message ago, so they repeat themselves. Second, a customer who had been chatting for ages got "Error" on every message after a while and gave up. Same customer, same afternoon.

Both problems come from the same place: the list of messages you send.

## A model has no memory

Each request stands alone. The model does not remember the last one, so a conversation only feels continuous because you send the earlier turns again every time. That is what history is: the system message, then each question and reply in order, growing by two messages per turn.

Fix the first problem and you create the second. History grows without end, and every model has a context limit: the most tokens it will read in one request. The lab model refuses anything over 400 tokens with a clear error. Real limits are larger, but so are real conversations, and every token you send is also a token you pay for.

## Counting before you send

You cannot know whether a request fits unless you count. `src/tokens.ts` gives you `countTokens` for one string and `countMessageTokens` for a list of messages, using the same rule as the lab model. Real providers publish their own tokenizers. The idea is the same: measure the request, compare it with a budget, act before the model has to refuse.

Set your budget below the model's limit. The reply needs room too, and a margin protects you when your count and the provider's count differ slightly.

## Trimming the oldest turns

When the request is too big, something has to go. The oldest turns are the least likely to matter, so they go first. Two messages must always stay:

- the system message, because it holds Moss's name, tone and rules
- the newest message, because it is the question you are answering

There is one more rule. If trimming leaves a reply at the front, with its question gone, drop it too. A history that starts with an answer to nothing confuses a model.

Here is the counting half of the idea, for a different job: reporting how full a request is.

```ts
import { countMessageTokens, type ChatMessage } from './tokens.ts'

function percentUsed(messages: ChatMessage[], budget: number): number {
  return Math.round((countMessageTokens(messages) / budget) * 100)
}
```

Another approach is to replace the oldest turns with a short summary written by the model. It keeps more meaning, but costs an extra request. Dropping is simpler and predictable, so it is where you start.

## Your tasks

Everything happens in `src/conversation.ts`:

1. `send` keeps the history and sends all of it.
2. `fitToBudget` trims a list of messages to a budget, keeping the system message and the newest message.
3. `send` trims before every request and keeps the trimmed history.

After task 1, run `node src/demo.ts` and watch the conversation fail as it grows. After task 3, run it again: the token count climbs, then levels off under the budget while Moss keeps answering.
