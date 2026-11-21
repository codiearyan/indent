# The loop that knows when to stop

## What you will be able to do

Pip can now answer a question with one lookup. Most real questions need more than one. By the end of this issue you will be able to:

- run every tool call in a reply and answer each one
- write the agent loop: ask, run tools, ask again, until the model answers
- count steps and stop a run that would otherwise go on forever

## The request from Noor

> **Noor:** Before a rider leaves I want to know if the whole order is on the shelf. Pip should look up the order, then check each item. And please make sure it can't get stuck. Last week a script of mine called the stock system all night.

"Is everything in order PL-2041 in stock?" takes several rounds. The model asks for the order. Once it sees the items, it asks for the stock of the first one, then the second. Only then can it answer. You do not know the number of rounds in advance. The model decides, one reply at a time.

## The loop

An agent is mostly a loop around the round trip you wrote in the last issue:

1. send the conversation and the tools
2. if the reply has no tool calls, that reply is the answer
3. otherwise append the assistant message, run the tools, append one tool message per call
4. go back to 1

The conversation grows each round. Every request carries all of it, because the model remembers nothing between requests. The tool results it saw two rounds ago are only "remembered" because you sent them again.

## Many calls, one reply

A single reply can hold more than one tool call, so the code that runs tools should take the whole `tool_calls` list and return one tool message per call. Here is the shape of that idea with a plain object of handlers, using a different tool than the ones in your task:

```ts
const handlers: Record<string, (args: any) => unknown> = {
  opening_hours: ({ day }) => (day === 'Sunday' ? 'closed' : '8:00 to 19:00')
}
const answer = (id: string, name: string, args: string) => ({
  role: 'tool' as const,
  tool_call_id: id,
  content: JSON.stringify(handlers[name](JSON.parse(args)))
})
```

The map from a tool name to a function is the seed of a tool registry. The next issue grows it.

## Why a step limit

The model chooses when to stop, and models can get stuck. They retry a failing call, poll for something that will not change, or bounce between two tools. Each round costs a request and time, and an agent with tools that act on the world can do real damage by repeating itself.

The fix is simple and not optional: cap the number of model requests per run. When the cap is reached, stop and say so clearly. A thrown error with a name you can catch, such as `StepLimitError`, lets the caller tell a person "Pip gave up on this one" instead of hanging or returning a half answer.

In this workspace, "Wait until order PL-2047 is delivered" is that kind of request. The order is being packed and nothing in the run changes it, so the model checks again every time you ask.

## Counting steps

Count model requests, not tool calls. A run that answers straight away is one step. A run with one tool round is two steps: the request that asked for the tool and the request that answered. With a limit of `maxSteps`, the request numbered `maxSteps` is still allowed, and if that one answers, the run succeeds. Off-by-one mistakes here are common, so the check looks at exactly that edge.

## Your work in this issue

All three tasks live in `src/agent.ts`. `src/tools.ts` already describes `get_order` and `check_stock` in `toolSpecs` and maps them to functions in `toolFunctions`. Write `runToolCalls`, then `runAgent`, then add the step limit. Run `node src/demo.ts`: it asks one question that ends and one that never would, and prints what happens to each.
