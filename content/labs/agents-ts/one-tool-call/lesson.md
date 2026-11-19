# One tool call, by hand

## What you will be able to do

Pebble Lane Pantry is a neighbourhood grocer that delivers by cargo bike. Noor Haddad runs the shop floor, and she wants an assistant called Pip that staff can ask about orders and stock. You are the developer building Pip. By the end of this chapter you will be able to:

- describe a function to a model with a JSON schema
- read the tool call the model sends back
- run the function yourself and return its result under the right id
- get the model's final, grounded answer

## The request from Noor

> **Noor:** Riders keep phoning me to ask where an order is. The answer is in our order list, but the chat model just guesses. Can Pip actually look it up?

A language model cannot read your database. What it can do is ask you to. You offer it tools, it replies "please run this tool with these arguments", you run it, and you send the result back. The model never executes anything. Your code does, and your code decides what happens.

## Describing a tool

A tool is a name, a sentence that says what it does, and a JSON schema for its arguments. The model reads all three, so write them for a reader. Here is a description for a different tool, one that checks stock:

```ts
const stockTool: OpenAI.Chat.ChatCompletionFunctionTool = {
  type: 'function',
  function: {
    name: 'check_stock',
    description: 'How many units of one product are on the shelf right now.',
    parameters: {
      type: 'object',
      properties: { sku: { type: 'string', description: 'Product code, like OAT-1L' } },
      required: ['sku']
    }
  }
}
```

You pass tools in the `tools` option of `chat.completions.create`. The `required` list matters: without it, the model is allowed to call the tool with no arguments at all.

## Reading the tool call

When the model decides to use a tool, the reply looks different. `finish_reason` is `tool_calls`, `message.content` is usually `null`, and `message.tool_calls` holds a list like this:

```
{ id: 'call_lab_1', type: 'function',
  function: { name: 'check_stock', arguments: '{"sku":"OAT-1L"}' } }
```

Three details trip people up. The arguments arrive as a JSON string, not an object, so you parse them. Tool calls have a `type`, and TypeScript only lets you read `function` after you check that it is `'function'`. And every call has an `id` that you will need in a moment.

## Answering the call

To give the model the result, you send the conversation again with two new messages at the end:

1. the assistant message that asked for the tool, exactly as it came back
2. a message with `role: 'tool'`, the `tool_call_id` of the call it answers, and the result as a string

The API checks this pairing. A tool message whose id does not match a call in the assistant message just before it is rejected with a 400 error. So is an assistant message with tool calls that nobody answered. The lab model enforces the same rules, so you will see these errors if the order is off.

`JSON.stringify` is the usual way to turn a result into text. The model reads JSON well, and an error object such as `{ "error": "No order with id PL-9999" }` is a result too. Send it back the same way and let the model explain it.

## Getting the final answer

With the result in the conversation, the second request comes back as a normal reply: `finish_reason` is `stop` and `content` is the answer, now based on real data instead of a guess. That is the whole protocol: request, tool call, your function, tool message, answer.

## Your work in this chapter

Everything happens in `src/assistant.ts`. First you describe `get_order` so the model can ask for it. Then you send a question and read back the tool call. Finally you do the full round trip and return Pip's answer. `src/tools.ts` already has `getOrder`, and `src/data.ts` holds today's orders.

Run `node src/demo.ts "Where is order PL-2041?"` as you go. It prints the tool, the call and the answer, or the error each step throws.
