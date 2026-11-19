# Generics

## What you will be able to do

The booking types are in, and Dele has started deleting small helper functions that did the same thing for different kinds of data. By the end of this issue you will be able to:

- write a generic function whose result keeps the type of its input
- limit a type parameter with `extends`, so the function can rely on some members
- build a small generic data structure
- let TypeScript infer type arguments from what the caller passes

## The ticket

> **Dele:** We have `lastBooking`, `lastNote`, `lastPhoto`, and three versions of "find the newest". They are the same code with different names. I tried one version typed with `unknown[]`, and every caller had to cast the result back. Can you make one of each that keeps the real types?

## Type parameters

A type parameter is a placeholder for a type, written in angle brackets after the function name. TypeScript fills it in at every call from the arguments:

```ts
function firstOr<T>(items: readonly T[], fallback: T): T {
  return items.length > 0 ? items[0] : fallback
}

const mechanic = firstOr(['Yusuf', 'Hanne'], 'nobody') // string
const hours = firstOr([6, 8], 0) // number
```

Nobody wrote `firstOr<string>`. TypeScript inferred `T` from the list. Compare this with typing the parameter as `unknown[]`: the function would accept anything, but its result would be `unknown`, and every caller would need a cast. With `any` it would be worse, because a wrong cast would not even be noticed. A type parameter keeps the connection between what goes in and what comes out.

`readonly T[]` as a parameter type is a small courtesy: it accepts both normal and read-only arrays, and it promises the caller that the function does not change the list.

## Constraints

Inside `firstOr`, nothing is known about `T`, so you cannot read `item.id`. When a function needs some members, constrain the parameter:

```ts
function totalMinutes<T extends { minutes: number }>(tasks: readonly T[]): number {
  return tasks.reduce((sum, task) => sum + task.minutes, 0)
}
```

`T extends { minutes: number }` means "any type that has at least a numeric `minutes`". Inside the function you may read `task.minutes`. Outside, the caller keeps their full type, extra members included. Calling it with objects that lack `minutes` is a type error at the call site, where the mistake is.

The difference from a plain parameter type matters when you return items. A function typed `(tasks: { minutes: number }[]) => { minutes: number }` returns only the part it knows about. The generic version returns `T`, so the caller can still read `task.title`.

## Generic data structures

Interfaces and type aliases can take type parameters too. `Map<string, number>` is one you already use. Your own looks the same:

```ts
interface Stack<T> {
  push(item: T): void
  pop(): T | undefined
}
```

A function that creates one, such as `createStack<T>(initial: readonly T[] = []): Stack<T>`, lets TypeScript infer `T` from the initial items. When there are none to infer from, the caller writes it: `createStack<string>()`.

## Your tasks

1. `src/lists.ts`: generic `lastItem` and `chunk`.
2. `src/latest.ts`: `latest` and `findById` with constraints, keeping the full item type.
3. `src/queue.ts`: a `Queue<T>` interface and a `createQueue` that infers `T`.

Run `node src/demo.ts` and `npm run types` as you go. The check calls your functions and type-checks your file with hidden code that relies on the item type being kept, and hidden misuse that must be rejected. `any` fails the check, and so does a result typed `unknown` where the caller should get the real type.
