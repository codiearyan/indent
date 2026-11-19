# Structured output

## What you will be able to do

Fernhollow's inbox is sorted now, and Ravi has noticed that a third of it is orders written as plain emails. By the end of this chapter you will be able to:

- ask a model for JSON and pull it out of whatever the model wraps it in
- check the shape of the data by hand, field by field
- send one repair request that tells the model exactly what was wrong

## The message from Ravi

> **Ravi:** Every order email ends with me copying the plant, the number and the pot size into the order sheet. Could Moss fill in the sheet? It has to be right, though. Last week I typed "three" into the quantity column and the sheet broke.

The order sheet is code. It needs an object with the right fields and the right types, every time.

## Asking for JSON

The system prompt already asks for JSON and shows the shape. That gets you most of the way, but a model is still a writer, not a serializer. Run `node src/demo.ts` and read the raw replies. You will see JSON inside a code fence with a friendly sentence above it, numbers written as words, and now and then something that is almost JSON but not quite.

So the work splits into three steps: find the JSON, check it, and ask again if it is wrong.

## Parse defensively

Never pass a reply straight to `JSON.parse`. Cut out the part that should be JSON first: the inside of a code fence if there is one, otherwise everything from the first `{` to the last `}`. Then parse it inside a `try`, and turn any failure into an error message of your own. That message is useful later, because it is something you can show the model.

## Validate by hand

Parsing proves the reply is JSON. It does not prove it is an order. TypeScript cannot help here either, because types disappear at runtime and the data comes from outside your program. You check each field yourself:

```ts
function checkPlantTag(value: unknown): string[] {
  if (typeof value !== 'object' || value === null) return ['tag must be an object']
  const tag = value as Record<string, unknown>
  const problems: string[] = []
  if (typeof tag.code !== 'string') problems.push('code must be a string')
  if (typeof tag.price !== 'number' || tag.price <= 0) problems.push('price must be a positive number')
  return problems
}
```

Returning a list of problems, instead of `true` or `false`, pays off in the next step. Each problem names a field and a rule, so it reads like a note to a colleague.

## Repair once

When the reply is wrong, ask again, but do not just repeat the question. A model that got it wrong once will often get it wrong the same way. Instead, continue the conversation:

1. the original system and user messages
2. the bad reply, as an `assistant` message
3. a new `user` message that lists the problems

Now the model can see its own mistake and your notes about it. The lab model works like this on purpose: it fixes a field only when your repair message names it.

Do this once. If the second reply is still wrong, something bigger is off, and an error that says so is better than a third request or a half-filled order sheet.

## Your tasks

Everything happens in `src/orders.ts`:

1. `parseJsonReply`: cut the JSON out of a reply and parse it, or throw "not valid JSON".
2. `validateOrder`: list the problems with each field, naming the field.
3. `extractOrder`: ask, check, repair once, then return the order or throw "invalid order".

Run `node src/demo.ts` to watch three emails go from raw replies to clean orders.
