# Types from types

## What you will be able to do

The booking model in `src/booking.ts` is settled. Around it, the old code has a dozen hand-written copies of the same shape: a booking without an id for the create form, a booking with only some members for the edit form, a count per level for the dashboard. By the end of this issue you will be able to:

- name the keys of a type with `keyof` and the type of one member with an indexed access type
- derive new types with `Pick`, `Omit`, `Partial` and `Record`
- write a small mapped type of your own

## The ticket

> **Dele:** Last month we added `dropOff` to bookings. Three of the copies got it, the fourth did not, and the edit form silently dropped the date. If every one of those types were built from `Booking`, that could not happen. Can you replace the copies?

## keyof and indexed access

`keyof` turns an object type into the union of its property names. Square brackets on a type read the type of one member:

```ts
interface Workshop {
  name: string
  openHours: { from: number; to: number }
  benches: number
}

type WorkshopKey = keyof Workshop // 'name' | 'openHours' | 'benches'
type Hours = Workshop['openHours'] // { from: number; to: number }
```

Together with generics, they type functions that take a property name. In `function read<T, K extends keyof T>(obj: T, key: K): T[K]`, the constraint lets `key` be only a real key of `T`, and `T[K]` is the type of exactly that member. Call `read(workshop, 'benches')` and the result is a `number`, not a union of every member type.

## Utility types

TypeScript ships generic types that transform other types:

- `Pick<T, Keys>`: only the listed members.
- `Omit<T, Keys>`: every member except the listed ones.
- `Partial<T>`: every member optional.
- `Record<Keys, V>`: an object with exactly those keys, each holding a `V`.

They nest. `Partial<Pick<Workshop, 'name' | 'benches'>>` is "maybe a name, maybe a bench count, nothing else". When `Workshop` gains a member, every derived type follows on its own, which is the whole point of the ticket.

`Record<ServiceLevel, number>` is a good fit for counters: forget one level and the object literal is a type error, so your dashboard can never miss a column.

One runtime trap: a `Partial` value can hold a key whose value is `undefined`, and the spread operator copies it. `{ ...booking, ...change }` with `change.notes === undefined` wipes the notes. Types describe shapes; they do not change what spread does.

## Mapped types

Utility types like `Partial` are mapped types, and you can write your own. A mapped type walks over a union of keys and produces one member per key:

```ts
type Flags<T> = {
  [K in keyof T]: boolean
}

type WorkshopFlags = Flags<Workshop>
// { name: boolean; openHours: boolean; benches: boolean }
```

Inside the brackets, `K` is one key at a time, so the member type can use it: `T[K]` is the type of that member in the original. A `?` after the brackets makes every produced member optional, and `readonly` before them makes every one read-only.

## Your tasks

1. `src/fields.ts`: `BookingKey`, `CustomerInfo` and a generic `pluck`.
2. `src/changes.ts`: `NewBooking`, `BookingChange` and `LevelCounts` from utility types, plus `applyChange` and `countLevels`.
3. `src/rules.ts`: your own mapped type `Rules<T>` and `brokenRules`.

`src/booking.ts` holds `Booking`, `ServiceLevel` and two sample bookings for the demo. Run `node src/demo.ts` and `npm run types` as you go. The check calls your functions and type-checks your file with hidden code that relies on the derived types being exact. A copied shape that drifts, or any use of `any`, fails it.
