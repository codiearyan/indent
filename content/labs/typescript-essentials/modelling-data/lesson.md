# Modelling data

## What you will be able to do

Your first helpers are typed and Dele has merged them. Now the shop's data needs types of its own. By the end of this issue you will be able to:

- describe an object with an interface or a type alias, and know when each fits
- mark members as optional or read-only
- use string literal types to allow a fixed set of values
- model "one of several shapes" as a discriminated union and handle every case with an exhaustive switch

## The ticket

> **Marit:** Last week someone booked a "quik" service and the price came out blank. The week before, a bike's serial number changed between drop-off and pickup, and we spent an hour looking for the right bike. Also, customers keep calling to ask where their bike is. Can the app tell them?

Each of those is a modelling problem. The data had no shape, so nothing stopped a wrong value from getting in.

## Interfaces and type aliases

Both name the shape of an object:

```ts
interface Mechanic {
  readonly badge: string
  name: string
  workshop?: 'north' | 'harbour'
}

type ShiftLength = 4 | 6 | 8
```

An `interface` describes an object and can be extended. A `type` alias can name any type: an object, a union, a literal, a function. Many teams use interfaces for plain object shapes and aliases for everything else, which is the habit this repo follows. Both are erased when Node runs the file, so they cost nothing at runtime.

## Optional and read-only members

`workshop?:` means the member can be missing. Reading it gives `string | undefined`, so TypeScript makes you handle the missing case. `readonly badge` means the member can be set when the object is created but not assigned afterwards. It is a compile-time promise only. For a serial number that must never change, that promise is exactly what you want, because every accidental reassignment in the code base becomes a type error.

## Literal types

A literal type allows one exact value: `'north'` is a type whose only value is the string `'north'`. A union of literals, like `'north' | 'harbour'` or `4 | 6 | 8`, is a closed set. Pass `'quik'` where a service level is expected and the compiler refuses before anyone sees a blank price. Comparing a plain string with a literal narrows it: after `if (text === 'north')`, `text` has the type `'north'`.

## Discriminated unions

A job at Spokewell can be waiting, in repair, waiting for parts or ready. Each state carries different data: a mechanic, a part and a number of days, a total. One object type with every member optional would allow nonsense like a waiting job with a total. A discriminated union is better: a union of object types that share one literal member, often called `kind`, with a different value in each.

When you `switch` on `kind`, TypeScript narrows the object in each `case`, so you can only read the members that variant actually has. After the last case, nothing is left of the union, and the type of the value is `never`. Assigning it to a variable typed `never` compiles only while every case is handled:

```ts
default: {
  const unhandled: never = shift
  throw new Error(`Unknown shift: ${JSON.stringify(unhandled)}`)
}
```

If someone adds a fifth variant later, this line becomes a type error until they handle it. The `throw` still matters at runtime, because data from old JSON can contain a kind the types never heard of.

## Your tasks

1. `src/levels.ts`: a `ServiceLevel` union of three literals, `parseLevel` and `levelPrice`.
2. `src/booking.ts`: the `Bike` and `Booking` interfaces with optional and read-only members, and `createBooking`.
3. `src/status.ts`: the `JobStatus` discriminated union and an exhaustive `statusMessage`.

Run `node src/demo.ts` to see the results and `npm run types` to type-check. The check calls your functions, then type-checks your file next to hidden code that uses your types correctly and hidden code that misuses them, such as reassigning a serial number. Any use of `any` fails the check.
