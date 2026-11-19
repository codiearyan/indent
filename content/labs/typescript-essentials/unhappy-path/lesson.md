# Typing the unhappy path

## What you will be able to do

The happy path of the booking app is typed. The last part of the move is everything that goes wrong: old data, thrown errors, and the parts supplier that answers late or not at all. By the end of this chapter you will be able to:

- explain the difference between `unknown` and `any`, and use `unknown` for data you do not control
- narrow a caught error before you read it
- return a `Result` type from a function that can fail, so callers have to handle the failure
- type async functions and the callbacks they take

## The ticket

> **Marit:** We are switching off the old app on Friday. Its export file has a few broken rows, and last time the import crashed halfway. Also, when the supplier is down, the quote screen shows "undefined". I would rather it said something a customer can understand.

## unknown versus any

Both accept every value. The difference is what you may do afterwards. With `any`, everything is allowed: property access, calls, assignment to any other type. The compiler stops checking, and nothing tells you when the value is not what you expected. With `unknown`, nothing is allowed until you narrow it with `typeof`, `in`, `instanceof`, `Array.isArray` or a type guard.

`JSON.parse` returns `any`, which is why imports crash quietly. Put the result into a variable typed `unknown` at once, and the compiler walks you through the checks:

```ts
const parsed: unknown = JSON.parse(text)
if (typeof parsed === 'object' && parsed !== null && 'hours' in parsed) {
  console.log(parsed.hours) // allowed, and typed unknown until you check it too
}
```

Note the `parsed !== null`. `typeof null` is `'object'`, an old JavaScript quirk that narrowing does not hide from you.

## Caught errors

JavaScript can throw anything: an `Error`, a string, a plain object, `undefined`. So in strict mode the variable in `catch (error)` has the type `unknown`. Before reading `error.message`, prove it exists. `error instanceof Error` covers `Error` and every subclass, including your own. Code you do not own may throw other things, which is why a helper that turns any caught value into a readable message is worth writing once and reusing.

A small class is the usual way to give a failure a name and data. Note that the class sets its member in the body. Node runs TypeScript by removing the types, so `constructor(readonly part: string)`, which also generates code, is not allowed here.

## Results instead of throws

Throwing is right for bugs. For failures a caller must plan for, such as a supplier being offline, a return type that says "this can fail" is clearer:

```ts
type Lookup<T> = { found: true; item: T } | { found: false; reason: string }
```

Because `found` is a literal in each variant, this is a discriminated union. A caller cannot read `item` until they have checked `found`, so the failure cannot be forgotten the way an uncaught rejection can.

## Async functions

An `async` function always returns a promise, so its return type is `Promise<...>`. Inside, you return the plain value and `async` wraps it. Callbacks are typed like any other function: `(id: string) => Promise<number>` is a function that takes a string and resolves to a number.

One trap: a function typed to return a promise can still throw before it returns one. If you call it outside your `try`, that throw escapes. Call and `await` inside the `try` and both kinds of failure land in the same `catch`.

## Your tasks

1. `src/import.ts`: `BookingRecord`, the `isBookingRecord` guard and `readBookings`, using `unknown`.
2. `src/errors.ts`: `errorMessage` and `describeOrderFailure` for anything a `catch` can catch.
3. `src/quotes.ts`: a `Result` type, an async `getQuote` that never rejects, and `unwrapOr`.

Run `node src/demo.ts` and `npm run types` as you go. The check throws real values at your code and type-checks your file with hidden uses and misuses. Any `any` fails it, which in this chapter is the whole point.
