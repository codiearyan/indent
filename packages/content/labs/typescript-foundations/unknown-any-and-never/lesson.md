# Data you cannot trust

## What you will be able to do

Until now, every value in this repo came from code you could read. This issue is about values that do not: text another system sends, turned into values by `JSON.parse`. The compiler cannot see what is in them, so you have to tell it honestly what is known, and find out the rest. Three types are about that: `any`, `unknown` and `never`. By the end of this issue you will be able to:

- say what `any` does, and replace it with a real type
- use `unknown` for a value from outside, and check it before using it
- check an object from outside property by property
- use `never` for what is left over, so a forgotten case is a compile error

## The request from Imogen

> **Imogen:** The cafe on Mill Street now sends its tea orders from its own till. Yesterday an order came through as thirty-one tins when they wanted four, and the till printed "undefined g" on a tin. Rafe says the code takes whatever the cafe sends. I want it to check what arrives before we pack a single tin.

All four tasks are in `src/cafe.ts`.

## any switches checking off

You met `any` in a message: `Parameter 'scones' implicitly has an 'any' type`. Written on purpose, `any` means "allow everything". Every property exists, every call is fine, and the value can go anywhere:

```ts
type Scone = { flavour: string; count: number }

function sconeLine(scone: any): any {
  return `${scone.flavor} x${scone.count}`
}
```

This compiles, and gives `undefined x6`, because the property is `flavour`. With `scone: Scone`, the compiler reads the name and catches it:

```
error TS2551: Property 'flavor' does not exist on type 'Scone'. Did you mean 'flavour'?
```

`any` also spreads. A value read from an `any` is `any` too, so one `any` turns off checking for everything that touches it. And `JSON.parse` gives back `any`, because it cannot know what the text holds. In this repo Check refuses `any` in your lines. This issue starts by taking it out.

## unknown is the honest type

`unknown` also accepts every value: a number, text, `null`, an object. The difference is what you may do with it afterwards, which is almost nothing until you find out what it holds:

```ts
function sconeCount(value: unknown): number {
  return value
}
```

```
error TS2322: Type 'unknown' is not assignable to type 'number'.
```

Reading a property or calling a method on it is refused too, with `'value' is of type 'unknown'`. That is the point. For a value from outside, `unknown` says exactly what you know: nothing yet. The checks you used in the last issue narrow it:

```ts
function sconeCount(value: unknown): number {
  if (typeof value === 'number') return value
  return 0
}
```

Inside the `if`, `value` is a `number`. So `any` says "trust me" and `unknown` says "check first".

## Checking an object from outside

An object takes a few steps, and each step tells the compiler a little more. `typeof value === 'object'` is true for `null` as well, so check for `null` too. Then `in` asks whether a property is there:

```ts
function readTray(value: unknown): Scone | null {
  if (typeof value !== 'object' || value === null) return null
  if (!('flavour' in value) || !('count' in value)) return null
  if (typeof value.flavour !== 'string' || typeof value.count !== 'number') return null
  return { flavour: value.flavour, count: value.count }
}
```

Without the first line, `in` is refused with `'value' is possibly 'null'`. After the second, `value.flavour` may be read, but it is still `unknown` until `typeof` says more. A list is an object too, and gets through the first line, but it has no `flavour`, so the second line stops it.

Why build a new object instead of `return value`? The compiler does not carry the property checks back onto the object, so that is refused with a long message that ends in the part to read:

```
error TS2322: Type 'object & Record<"flavour", unknown> & Record<"count", unknown>' is not assignable to type 'Scone | null'.
  ...
      Type 'unknown' is not assignable to type 'string'.
```

## never, what is left over

In the last issue, `never` was the type of what is left once every kind of a union has a branch. A function can take it as its parameter. Then it accepts only what is left over, which is nothing:

```ts
function noOvenFor(value: never): never {
  throw new Error(`No oven for ${value}`)
}
```

Its result type is `never` as well, because it never gives anything back: it always throws. Call it in the last branch of a `switch` over a union. While every kind has its `case`, the call compiles. Add a kind to the union and forget its `case`, and it is refused:

```
error TS2345: Argument of type '"brioche"' is not assignable to parameter of type 'never'.
```

It also helps at run time. A value from outside can still break its type: a till sends a word nobody added to the union. Then the code reaches that branch, and the `throw` stops it, instead of printing a line nobody wrote.

## Your work in this issue

Open `src/cafe.ts`. The types at the top are shared by every task; leave them as they are. Take `any` out of the tin line, check the tins the till sends, check a whole order from outside, and write `notHandled` for the statuses. Run `npm run types` and `node src/cafe.ts` after each change. Check uses your functions with values of its own, and does not accept `any`, `as` or `!` in place of a check.
