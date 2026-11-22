# A name for a shape

## What you will be able to do

In the first part you wrote the shape of an order as an object type, right after the parameter that takes it. That works for one function. Oakhollow's code has many functions that take an order line, and Rafe wrote its shape out in each of them. When the shop added grams per tin, one copy got it and one did not. This issue opens the second part, about naming the shapes. By the end of it you will be able to:

- give a type a name with a type alias, and use the name wherever the type goes
- write an object shape as an interface
- use one named type inside another
- build one shape on another, and say where the two forms differ

## The request from Imogen

> **Imogen:** Rafe wrote what an order line looks like in every function that takes one. We changed it last month and missed a copy, and now the compiler is unhappy with a function nobody touched. Can we write each shape once, and have it stay right everywhere?

All four tasks are in `src/orders.ts`.

## A type alias

A **type alias** gives a type a name: the word `type`, the name, `=` and the type.

```ts
type Tray = { flavour: string; count: number }

function trayLabel(tray: Tray): string {
  return `${tray.count} ${tray.flavour} scones`
}
trayLabel({ flavour: 'cheese' })
```

Now `Tray` can go anywhere a type goes: after a parameter, as a result type, on a `const`, inside a list as `Tray[]`. The shape is written once, so every function that says `Tray` changes together when it changes. Errors use the name, which makes them shorter:

```
src/scones.ts:6:11 - error TS2741: Property 'count' is missing in type '{ flavour: string; }' but required in type 'Tray'.
```

A type alias is only a name. It makes no new kind of value, and an object written elsewhere with the same properties fits it too.

Like a function, a type alias or an interface can have `export` in front, so other files can use it: `export type Tray = ...`. Check uses your types from a file of its own, so the tasks ask for `export`.

## An interface

An **interface** is the other way to name an object shape. It has no `=`, and the properties go straight into the curly braces:

```ts
interface Baker {
  name: string
  shift: string
  phone?: string
}
```

Everything you know about object types works inside: a question mark for a property that may be left out, `readonly` for one that never changes. For an object shape, an interface and a type alias with the same properties are used the same way, and the compiler treats them the same way.

## One type inside another

A property's type can be any type, and that includes a name you wrote:

```ts
type Oven = { name: string; maxTrays: number }
type Bake = { bakedAt: string; oven: Oven; trays: Tray[] }
const morning: Bake = { bakedAt: '06:30', oven: { name: 'Big oven' }, trays: [] }
```

A `Bake` has an oven, and that oven has a name and a number of trays. `morning.oven.name` is text, and the compiler checks the inner object as carefully as the outer one:

```
src/scones.ts:10:43 - error TS2741: Property 'maxTrays' is missing in type '{ name: string; }' but required in type 'Oven'.
```

The column points inside the bake, at the oven that is not a whole `Oven`.

## Where the two differ

For most object shapes either form will do. They differ in three places.

**Only a type alias can name something that is not an object shape.** `type Grams = number` or `type TrayCount = [string, number]` are fine. An interface always describes an object. In the next issue you will meet types that only a type alias can name.

**They build on another shape in different ways.** An interface says `extends` and the name of the shape it builds on. A type alias joins two shapes with `&`, which means "both at once":

```ts
interface SpecialTray extends Tray {
  topping: string
}
const special: SpecialTray = { flavour: 'fruit', count: 6 }

type GlazedTray = Tray & { glaze: string }
```

Both have everything a `Tray` has, plus one more property. A special tray can go wherever a tray is asked for, because it has a flavour and a count. A plain tray cannot go where a special one is asked for, and the line that makes `special` is refused:

```
src/scones.ts:15:7 - error TS2741: Property 'topping' is missing in type '{ flavour: string; count: number; }' but required in type 'SpecialTray'.
```

**The same name twice.** Two interfaces with the same name are joined into one with the properties of both. Two type aliases with the same name are an error, `Duplicate identifier 'Tray'`, shown on both. Joining by accident is a surprise, so give every shape its own name.

## Your work in this issue

Open `src/orders.ts`. Name the shape of an order line, write a customer as an interface, put an address inside a parcel, and build batch tins on tins. Run `npm run types` and `node src/orders.ts` after each change. Check uses your types and functions with values of its own.
