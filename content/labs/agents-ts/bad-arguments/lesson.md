# Tools that fail politely

## What you will be able to do

Pip can now loop through as many tool calls as a question needs. It also trusts every one of them. By the end of this issue you will be able to:

- keep tools in a registry that both describes them and runs them
- parse and validate tool arguments against their schema
- turn an unknown tool, a bad argument or a crashing tool into a result the model can read
- watch the model correct itself instead of watching your run crash

## The request from Noor

> **Noor:** I asked Pip to set aside three jars of honey for Ben's order and got a stack trace in the staff chat. Then I asked again and it worked. What happened?

What happened is normal model behaviour. Models sometimes call a tool by a name that sounds right but does not exist. They send `"3"` where the schema says integer. And tools fail on their own: a reservation for 40 jars when 12 are left should fail. None of these should end the run. Each one is information the model can use, if you pass it back.

## A registry

Until now the tool descriptions and the functions lived in two places that you had to keep in sync. A registry puts them together: one entry per tool, keyed by the name the model uses, with a description, a parameter schema and a `run` function. From it you can produce the `tools` list for the API and look up what to run, so the two can never drift apart.

## Validate before you run

The arguments arrive as a string written by a model. Treat them like input from a web form. Parse them, check they are an object, check each required name is there, refuse keys the tool does not take, and check each value's type. Here is the core of a type check for a different kind of input, a delivery slot, to show the style:

```ts
function checkSlot(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return 'slot must be an object'
  const { hour } = value as { hour?: unknown }
  if (!Number.isInteger(hour)) return `hour must be a whole number, got ${JSON.stringify(hour)}`
  return null
}
```

Good error text names the field and shows what was received. That is exactly what the model needs to send a corrected call.

## Errors are results

The key move in this issue is small. Instead of throwing, the code that runs a tool call returns a JSON string either way:

```
{"total": 12.5}
{"error": "Unknown tool find_product. Available tools: get_order, search_products, reserve_stock."}
```

Both go into a tool message with the right `tool_call_id`. From the API's point of view nothing went wrong, so the conversation continues, and on the next turn the model reads the error and tries something else. Listing the available tools in the unknown-tool message gives it the way out.

Catch failures from the tool itself too. A `run` function can throw, or return a promise that rejects. Put the `await` inside the `try`, or a rejection slips past you.

## What the model does next

The local model behaves like a careful but imperfect assistant. Asked to reserve honey, it first calls `find_product`, which is not a tool. Told that, it searches with `search_products`, then reserves with the quantity as text. Told that the quantity must be an integer, it tries again correctly. With your error handling in place that is five model requests and a correct answer. Without it, the first mistake crashes the run.

The step limit from the last issue still matters here. A model that keeps making the same mistake is now a loop instead of a crash, and the limit ends it.

## Your work in this issue

In `src/registry.ts` write `parseArguments`, then `executeToolCall`. In `src/agent.ts` write `toolSpecs` and change the loop to use `executeToolCall`. `src/tools.ts` holds the shop's registry. `node src/demo.ts` shows three bad calls answered as results, then runs two reservations end to end.
