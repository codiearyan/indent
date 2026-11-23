# One function for every type

## What you will be able to do

Some code does not care what it holds. Taking the first item of a list works the same for blends, weights and orders. So far you had two ways to type it: one copy per type, or `unknown`, which forgets the type on the way out. A **generic** function is the third way: one function whose types follow whatever it is given. By the end of this issue you will be able to:

- write a generic function with a type parameter, `<T>`
- limit a type parameter to types that have what the function needs
- write a type alias that takes a type parameter
- tell when a type parameter is doing nothing, and take it out

## The request from Bryn

> **Bryn:** Rafe's list helpers work on any list, but after them the compiler forgets what was in it. I take the first order off the list and it will not let me read the tins, so I end up guessing. I want the helpers to hand back the same kind of thing I gave them.

All four tasks are in `src/lists.ts`.

## A type parameter

Here is a helper written with `unknown`:

```ts
function lastOf(items: unknown[]): unknown {
  return items[items.length - 1]
}
const flavour: string | undefined = lastOf(['plain', 'cheese'])
```

```
error TS2322: Type 'unknown' is not assignable to type 'string | undefined'.
```

The list of text went in, and the type did not come out. A **type parameter** fixes that. It is a name in angle brackets after the function's name, usually `T`, and it stands for a type the call fills in:

```ts
function lastOf<T>(items: T[]): T | undefined {
  return items[items.length - 1]
}
```

Called with a list of text, `T` is `string`, and the result is `string | undefined`. Called with numbers, it is `number | undefined`. The call does not have to say what `T` is: the compiler works it out from the argument. You have used one already: `Array<number>` is a generic type, with `number` filling in its type parameter.

The result includes `undefined` because a list can be empty. A type parameter does not change what the code does, only what the compiler knows.

## A constraint

Inside a generic function, the compiler knows nothing about `T`. It could be a number, so reading a property is refused:

```ts
function heaviest<T>(items: T[]): T | undefined {
  return items.find((item) => item.grams > 1000)
}
```

```
error TS2339: Property 'grams' does not exist on type 'T'.
```

A **constraint** says what every `T` must have, with `extends`: `<T extends { grams: number }>`. Now the body may read `grams`, and a call with a list of things without grams is refused.

Why not write the parameter as `items: { grams: number }[]` instead? Then the result would be `{ grams: number }`, and a cake's flavour or a tray's position would be lost. With `T`, the call keeps the whole type of what it passed in, and only promises the grams.

## A generic type alias

A type alias can take a type parameter too:

```ts
type Batch<T> = { baked: T[]; burnt: number }

const scones: Batch<string> = { baked: ['plain', 'cheese'], burnt: 1 }
const loaves: Batch<number> = { baked: [800, 400], burnt: 0 }
```

`Batch<string>` is that shape with `string` wherever `T` is. One alias, written once, for a batch of anything.

It works with unions of shapes as well. A shape can be told apart by `true` and `false`, as it was by `kind`: like a word, `true` can be a type, the type of exactly the value `true`. Numbers can be types the same way: `125` as a type allows only 125.

## When not to use one

A type parameter earns its place when it ties things together: what goes in with what comes out, or two parameters with each other. When it ties nothing, it only makes the code harder to read. And it can promise more than the function can keep:

```ts
function addTrays<T extends number>(a: T, b: T): T {
  return a + b
}
```

```
error TS2322: Type 'number' is not assignable to type 'T'.
  'number' is assignable to the constraint of type 'T', but 'T' could be instantiated with a different subtype of constraint 'number'.
```

The second line is the reason. `T` could be a narrower type than `number`, such as `2` alone, and the sum of two 2s is not 2. So the promise "you get back the same type you gave" cannot be kept. What the function means is plain `number` in and `number` out. Write that.

The same goes for a `T` that appears only once, as in `<T extends string>(name: T): string`: it ties nothing to anything, and `name: string` says the same.

## Your work in this issue

Open `src/lists.ts`. Make `firstOf` keep its type, write `byId` with a constraint, write a `Result` that holds a value of any type, and take two type parameters out where they do nothing. Run `npm run types` and `node src/lists.ts` after each change. Check uses your functions with lists of its own types, and does not accept `any` or `as`.
