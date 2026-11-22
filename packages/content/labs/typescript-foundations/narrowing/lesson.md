# Which kind is it

## What you will be able to do

In the last issue you wrote types that allow a few kinds of value. Now the code has to use them. A function cannot call a text method on a ref until it knows the ref is text, or read a locker number until it knows the parcel goes to a locker. Finding out, in a way the compiler follows, is called **narrowing**. By the end of this issue you will be able to:

- narrow a union with `typeof`, `in`, `===` and a truthiness check
- say what the compiler knows inside each branch, and after it
- choose between `=== null` and a truthiness check when `0` is a real value
- write a `switch` over a union of shapes where a forgotten kind is a compile error

## The request from Bryn

> **Bryn:** Since the types went in, the packing code is all red. It asks a number for its length, and it told me a shelf was sold out before I had even counted it. And when we start using a courier, I want the code to show us every place that has to change, not find out from a lost parcel.

All four tasks are in `src/packing.ts`.

## Narrowing with typeof

`typeof` gives the type of a value as a word while the code runs: `'string'`, `'number'`, `'boolean'`, `'object'` and a few more. The compiler understands an `if` that compares it:

```ts
function trayTag(tray: number | string): string {
  if (typeof tray === 'number') {
    return `Tray ${tray.toFixed(0)}`
  }
  return tray.toUpperCase()
}
```

Inside the `if`, `tray` is a `number`. The branch returns, so after it the only kind left is `string`, and the text method is allowed.

A check it does not understand narrows nothing. Asking `if (tray.length)` to spot text is refused before it can tell anything:

```
error TS2339: Property 'length' does not exist on type 'string | number'.
  Property 'length' does not exist on type 'number'.
```

Watch two traps. `typeof null` is `'object'`, so `typeof` cannot tell an object from `null`. And a list is an object too: `typeof` never gives `'array'`, and a comparison with a word it never gives is refused, `This comparison appears to be unintentional because the types ... have no overlap`.

## Narrowing with in

`typeof` says `'object'` for every object, so it cannot tell two shapes apart. The `in` operator asks whether an object has a property, without reading it:

```ts
type Scones = { flavour: string; count: number }
type Cake = { flavour: string; message: string }

function icing(order: Scones | Cake): string {
  if ('message' in order) return order.message
  return 'No icing'
}
```

Inside the `if`, `order` is a `Cake`. Reading `order.message` to find out is the step that is refused, because scones have no message:

```
error TS2339: Property 'message' does not exist on type 'Cake | Scones'.
```

## Equality and truthiness

`===` narrows too. After `if (count === null) return 'Not baked yet'`, the compiler knows `count` is a number for the rest of the function. Without that line, using it as one is refused:

```
error TS18047: 'count' is possibly 'null'.
```

A **truthiness check**, `if (note)` or `if (!note)`, narrows away `null` and `undefined` as well. It also treats `0`, `''` and `false` as missing, because they are falsy in JavaScript. For an optional note, where an empty note is no note, that is what you want. For a count, where `0` is a real answer, it is a bug: the compiler is happy, and the code gives the "not counted" line for an empty shelf. Ask for exactly the value you mean.

You may have seen a `!` after a value, as in `count! > 0`. It tells the compiler the value is not `null` or `undefined` without checking, so the error goes and the bug stays. Like `as`, Check does not accept it in this issue.

## A switch over kinds

On a union of shapes with a field like `kind`, comparing that field narrows to one shape. A `switch` does the same in each `case`:

```ts
type BakeOrder =
  { kind: 'scones'; count: number } | { kind: 'cake'; message: string } | { kind: 'loaf' }

function orderLine(order: BakeOrder): string {
  switch (order.kind) {
    case 'scones':
      return `${order.count} scones`
    case 'cake':
      return `Cake: ${order.message}`
    case 'loaf':
      return 'One loaf'
  }
}
```

There is no `default`, and nothing after the `switch`. The compiler sees a `return` for every kind, and accepts that the function always gives back text. Leave out the `loaf` case, or add a fourth kind to `BakeOrder`, and it no longer does:

```
error TS2366: Function lacks ending return statement and return type does not include 'undefined'.
```

That error is the point. A `default` that returns a line would catch the new kind without a word.

The second way works after a row of `if`s, or in a `default`. Once every kind has been handled, nothing is left, and the compiler gives what is left the type **`never`**, the type with no values. Put `const left: never = order` there. While a kind is unhandled, that line is refused, and the message names the kind:

```
error TS2322: Type '{ kind: "loaf"; }' is not assignable to type 'never'.
```

## Your work in this issue

Open `src/packing.ts`. The types at the top are shared by every task; leave them as they are. Tidy a ref of either kind, count tins or a sampler, tell a shelf nobody counted from an empty one, and write the delivery line whole. Run `npm run types` and `node src/packing.ts` after each change. Check uses your functions with values of its own, and does not accept `as` or `!` in place of a check.
