# Types and narrowing

## What you will be able to do

Spokewell is a bike repair shop with two workshops and a booking app that customers use to drop off their bikes. The app was written in plain JavaScript over a few busy summers. Marit Solberg, who owns the shop, has hired you to move it to TypeScript, and Dele Ashby, the developer who wrote most of it, reviews your work.

By the end of this issue you will be able to:

- annotate a function's parameters and return value
- accept more than one kind of input with a union type
- narrow a union with `typeof`, with `in`, and with a type guard you write yourself
- make `null` and `undefined` visible in a type and handle them on purpose

## The ticket

> **Dele:** Welcome aboard. We are starting with the three helpers that break most often: prices, contact details and the greeting on the booking page. Each one gets a value that can be several different things, and the JavaScript just hopes for the best. Type them so the compiler tells us when we forget a case.

## Annotations and unions

A type annotation goes after a name with a colon. On a function, you annotate each parameter and, after the parameter list, the return value. A union type, written with `|`, says a value can be one of several types.

```ts
function formatDuration(minutes: number | string): string | null {
  if (typeof minutes === 'number') {
    return `${minutes} min`
  }
  const parsed = Number.parseInt(minutes, 10)
  return Number.isNaN(parsed) ? null : `${parsed} min`
}
```

Writing the return type yourself, instead of letting TypeScript infer it, is a promise to every caller. If a later edit returns something else, the error appears inside the function, where the mistake is, and not in some caller far away.

## Narrowing

Inside `formatDuration`, `minutes` starts as `number | string`. You cannot call `.toFixed` on it, because it might be a string. Narrowing is how you prove which member you have. After `typeof minutes === 'number'` returns, TypeScript knows that in the rest of the function `minutes` is a string. It follows `if`, `return`, `switch` and the `&&` and `?:` operators.

`typeof` works for primitive types. For objects, the `in` operator checks whether a property exists, and TypeScript narrows on it too:

```ts
type Card = { last4: string }
type Cash = { tendered: number }

function isCard(payment: Card | Cash): payment is Card {
  return 'last4' in payment
}
```

The return type `payment is Card` makes this a type guard. It still returns a boolean at runtime, but wherever you write `if (isCard(p))`, TypeScript narrows `p` to `Card` inside the `if` and to `Cash` outside it. A guard with a plain `boolean` return type checks the same thing but teaches the compiler nothing.

## Null and undefined

In strict mode, `null` and `undefined` are not part of every type. A value that might be missing has to say so, for example `string | null` or `Customer | undefined`. An optional property, written `nickname?: string`, can be absent, which reads as `undefined`.

Three tools keep this short:

- `value?.name` reads `name` only when `value` is not `null` or `undefined`, and gives `undefined` otherwise.
- `a ?? b` gives `b` only when `a` is `null` or `undefined`.
- `a || b` gives `b` for any falsy `a`, which includes `0` and the empty string.

Picking between `??` and `||` is a real decision. Sometimes an empty string should count as a value and sometimes it should not.

## Your tasks

Each task file starts with a comment that restates the job. The functions have no types yet, so `npm run types` reports errors right away. That is the starting point, not a mistake.

1. `toCents` in `src/price.ts` takes a number or a string and returns cents or `null`.
2. `isEmailContact` and `contactLine` in `src/contact.ts` tell two kinds of contact apart.
3. `findCustomer` and `greeting` in `src/greeting.ts` handle customers that might not exist and nicknames that might be missing.

Run `node src/demo.ts` to see your functions work, and `npm run types` to see what the compiler thinks. The check does both: it calls your functions, and it type-checks your file together with hidden code that uses it correctly and hidden code that misuses it. Writing `any` anywhere in a task file fails the check, because `any` turns checking off.
