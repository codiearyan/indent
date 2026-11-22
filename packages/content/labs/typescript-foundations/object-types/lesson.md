# The shape of an object

## What you will be able to do

Values, functions and lists have types. What is left is the thing Oakhollow has most of: orders. An order is an object, with an id, some tins, maybe a gift note, and Rafe's functions took any object and read whatever properties they hoped were there. When a property was missing, they printed `undefined` on a slip and carried on. In this last issue of the part you write the shape of an object as a type. By the end of it you will be able to:

- write an object type, with each property and its type
- say which properties a value must have, and which extra ones it may have
- mark a property a value may leave out, and deal with it being missing
- mark a property that can never change after the object is made

## The request from Imogen

> **Imogen:** A customer opened their parcel and the slip said "note: undefined". The order had no gift note, which is most of them. And last week an order changed its id halfway through packing and we shipped it twice. Can the code know what an order looks like?

All four tasks are in `src/orders.ts`.

## An object type

An object type is written like an object, with a type where each value would be:

```ts
function trayLabel(tray: { flavour: string; count: number }): string {
  return `${tray.count} ${tray.flavour} scones`
}
```

The properties are separated by semicolons; commas work too. Now the compiler knows `tray` has a `flavour` that is text and a `count` that is a number, and nothing else. Reading `tray.colour` is refused, and so is a call with a property missing:

```
src/scones.ts:4:11 - error TS2741: Property 'count' is missing in type '{ flavour: string; }' but required in type '{ flavour: string; count: number; }'.

4 trayLabel({ flavour: 'cheese' })
            ~~~~~~~~~~~~~~~~~~~~~
```

Read it in two halves: the first type is what you passed, the second is what was asked for. The note under the error, not shown here, points at the property in the type.

## Extra properties

The compiler checks that a value has the properties the type names. It does not mind more:

```ts
const tray = { flavour: 'fruit', count: 6, glaze: true }
trayLabel(tray) // fine: tray has a flavour and a count
```

TypeScript compares shapes, not names. Any object with the right properties fits, wherever it came from.

There is one exception, and it catches typing mistakes. When you write the object right inside the call, with a property the type does not know, the compiler assumes you misspelt something:

```
src/scones.ts:5:43 - error TS2353: Object literal may only specify known properties, and 'glaze' does not exist in type '{ flavour: string; count: number; }'.
```

An object literal is an object written out in curly braces in the code. A misspelt key in one is refused at once, often with a "Did you mean".

## A property that may be missing

A question mark after a property's name makes it optional: an object may leave it out.

```ts
function topping(tray: { flavour: string; topping?: string }): string {
  return tray.topping.toUpperCase()
}
```

Inside the function, a missing property reads as `undefined`, and the compiler knows it:

```
src/scones.ts:12:10 - error TS18048: 'tray.topping' is possibly 'undefined'.

12   return tray.topping.toUpperCase()
            ~~~~~~~~~~~~
```

So you check first. After `if (tray.topping === undefined) return 'Plain'`, the compiler knows the rest of the function only runs when there is a topping, and lets you use it as text. Putting a missing value inside a template literal is allowed, though: it prints the word `undefined`, which is what Imogen's customer read.

## A property that can never change

`const` stops a name from pointing at another object. It does not stop the object's properties from changing. For that, put `readonly` in front of a property in the type:

```ts
const batch: { readonly bakedAt: string; trays: number } = { bakedAt: '06:30', trays: 4 }
batch.trays = 5
batch.bakedAt = '07:00'
```

The first change is fine. The second is refused:

```
src/scones.ts:10:7 - error TS2540: Cannot assign to 'bakedAt' because it is a read-only property.
```

Like every type, `readonly` is gone when Node runs the file. If you silence the error, the property still changes. It protects you only because the compiler refuses the line.

## Your work in this issue

Open `src/orders.ts`. Give an order line its shape, let a gift note be missing, keep an order's id fixed, and write a function that gives back a parcel as an object. Run `npm run types` and `node src/orders.ts` after each change. Check uses your functions and your order with values of its own.

That is the end of the first part. Next, these object types get names, so you can write the shape of an order once and use it everywhere.
