# One of a few kinds

## What you will be able to do

Every type so far has been one thing. Real values are often one of a few. An order ref at Oakhollow is a number for the old orders and text for the new ones. A zone is one of three words the courier knows, and Rafe's code let any text through, so a typo cost the wrong price. In this issue you write types that allow a few kinds of value, and exactly those. By the end of it you will be able to:

- write a union type, for a value that is one kind or another
- write exact words as types, and join them into a union
- read what the compiler says when a word is not one of them
- write a union of object shapes, with a field that tells them apart

## The request from Bryn

> **Bryn:** Someone typed Local with a capital last week, and the parcel went out at the europe price, because the code only knows the lower case one. Then a locker parcel came back: its locker number was in the address field, and the label printer left it off. Can the code refuse words it does not know?

All four tasks are in `src/delivery.ts`.

## One kind or another

A **union type** joins types with `|`, read as "or". A value fits when it fits any one of them:

```ts
function trayTag(tray: number | string): string {
  return `Tray ${tray}`
}
trayTag(4)
trayTag('B')
```

Inside the function, the compiler only lets you do what every member of the union allows. A template literal works with both. Change the line to `return tray.toUpperCase()`, and it is refused, because a number has no such method:

```
src/trays.ts:2:15 - error TS2339: Property 'toUpperCase' does not exist on type 'string | number'.
  Property 'toUpperCase' does not exist on type 'number'.
```

The indented line names the member in the way. The next issue shows how to find out which kind you have.

Watch the brackets when a union goes into a list. `string | number[]` reads as text, or a list of numbers. A list whose entries may be either needs round brackets: `(string | number)[]`. Without them, a list of both is refused:

```ts
const trays: string | number[] = [4, 'B']
```

```
src/trays.ts:7:7 - error TS2322: Type '(string | number)[]' is not assignable to type 'string | number[]'.
```

Written the other way round, `number | string[]`, the same mistake gets a shorter message that points at one entry of the list: `Type 'number' is not assignable to type 'string'`. The compiler took the list part of the union, `string[]`, and found a number in it.

## Exact words as types

A word in quotes can be a type: the type that allows exactly that text and nothing else. A union of them is a list of allowed words:

```ts
type Flavour = 'cheese' | 'fruit' | 'plain'

function bake(flavour: Flavour): void {}
bake('Cheese')
const special: Flavour = 'Cheese'
```

Both lines with a capital are refused:

```
src/trays.ts:12:6 - error TS2345: Argument of type '"Cheese"' is not assignable to parameter of type 'Flavour'.
src/trays.ts:13:7 - error TS2820: Type '"Cheese"' is not assignable to type 'Flavour'. Did you mean '"cheese"'?
```

The compiler writes the words in double quotes, whichever quotes you used. When it spells a union out, it may list the words in another order than yours. The order in a union does not matter.

A word type is narrower than `string`: every flavour is text, but not every piece of text is a flavour. So a value typed as any text is refused where a flavour is asked for. `let choice = 'fruit'` is such a value: the compiler gives a `let` the type `string`, because it could change later. A `const` keeps the exact word, so `const choice = 'fruit'` can be passed to `bake`.

Word types check what comes back too. With `Flavour` as the result type of a function, every `return` must give one of the three words, so a misspelt one is caught where it is written.

## A union of shapes

A union can join object shapes. Give each shape a field with its own word, and the compiler can tell them apart:

```ts
type BakeOrder =
  { kind: 'scones'; count: number } | { kind: 'cake'; message: string } | { kind: 'loaf' }

const order: BakeOrder = { kind: 'cake' }
```

A long union is often written one member to a line, with a `|` in front of each, the first one included. The compiler reads it the same way.

A value fits when it fits one shape whole: its kind, and what that kind needs. The cake above has no message:

```
src/trays.ts:20:7 - error TS2322: Type '{ kind: "cake"; }' is not assignable to type 'BakeOrder'.
  Property 'message' is missing in type '{ kind: "cake"; }' but required in type '{ kind: "cake"; message: string; }'.
```

The indented line shows which shape the compiler picked from the kind. A property that belongs to another shape is refused the same way, with `Object literal may only specify known properties`.

On a value of the whole union you can read `order.kind`, because every shape has it, and its type is the three words. The other properties exist only in some shapes, so `order.message` is refused for now. The next issue is about reaching them.

## Your work in this issue

Open `src/delivery.ts`. Take refs of both kinds, allow exactly three zones, make a function give back only a real status, and write the delivery type whole. Run `npm run types` and `node src/delivery.ts` after each change. Check uses your types with values of its own.
