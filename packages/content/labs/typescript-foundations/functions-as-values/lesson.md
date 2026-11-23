# Functions you pass around

## What you will be able to do

In JavaScript a function is a value. You pass one to `map`, keep one in a variable, give one back from another function. TypeScript gives that value a type, like any other: what the function takes and what it gives back. Then every function passed in is checked before it runs. By the end of this issue you will be able to:

- write the type of a function, and of a callback parameter
- give a function type a name with a type alias
- say when a callback may take fewer values, and why a question mark there is a trap
- write a function that gives back a function, with every type

## The request from Imogen

> **Imogen:** I want to try offers without asking Rafe for new code each time: ten percent off on Friday, fifty pence off a tin. Rafe says his code takes the offer as a function. Last week someone passed one that gave back the price as text, and the till showed the price as NaN. I want the compiler to refuse that kind of offer.

All four tasks are in `src/offers.ts`.

## The type of a function

A function type looks like an arrow function with types and no body: the parameters in round brackets, an arrow, then the type of what it gives back.

```ts
function bakeAll(trays: number[], bake: (tray: number) => string): string[] {
  return trays.map(bake)
}
```

`bake` is any function that takes a number and gives back text. Without that type, `bake` is a parameter like any other with no type, and you know the message: `Parameter 'bake' implicitly has an 'any' type`.

The names inside a function type are only labels. A function with its parameter called `n` fits `(tray: number) => string` just as well. What counts is the types, in order.

A wrong function is refused where it is passed:

```
error TS2322: Type 'number' is not assignable to type 'string'.
```

That is what `bakeAll(trays, (tray) => tray * 2)` gets: the arrow gives back a number where text was promised.

## The callback gets its types for free

Look at that arrow again: `(tray) => tray * 2`. `tray` has no type written, and yet the compiler knows it is a number. When a function is passed where a function type is expected, its parameters take their types from that function type. This is called **contextual typing**.

So when a function's parameter has no type, you see two kinds of errors: one on the parameter, and one on each arrow passed to it, `Parameter 'tray' implicitly has an 'any' type`. Write the type of the parameter, and the errors on the arrows go too.

## A name for a function type

A function type can get a name with a type alias, like an object type:

```ts
type Topping = (scone: string) => string

const jam: Topping = (scone) => `${scone} with jam`

function topAll(scones: string[], toppings: Topping[]): string[] {
  return scones.map((scone) => toppings.reduce((s, top) => top(s), scone))
}
```

The name says what the function is for, it is written once, and a list of them is `Topping[]`. On `jam`, the alias gives `scone` its type, so the arrow needs none.

## Fewer values are fine, a question mark is not

`map` passes three values to its callback: the item, its position and the whole list. Yet `trays.map((tray) => ...)` is fine. A function that takes fewer parameters fits a function type with more: JavaScript passes the extra values, and the function ignores them. The other way round is refused: a callback that needs three values, where the function type passes two, gets `Target signature provides too few arguments. Expected 3 or more, but got 2.`

So when you write a callback type, write every value your code always passes, with no question mark. It is tempting to write `index?: number` because some callbacks do not use it, but that says something else: "I might not pass it". Then every callback that uses it is refused:

```ts
function shelfLabels(names: string[], label: (name: string, shelf?: number) => string): string[] {
  return names.map((name, i) => label(name, i + 1))
}

shelfLabels(['Cheese'], (name, shelf) => `${shelf.toFixed(0)}: ${name}`)
```

```
error TS18048: 'shelf' is possibly 'undefined'.
```

Take the question mark away, and both kinds of callback fit.

## Functions that give back functions

A function can make a function and give it back. The result type is then a function type:

```ts
function extraScones(extra: number): (ordered: number) => number {
  return (ordered) => ordered + extra
}

const bakersDozen = extraScones(1)
bakersDozen(12) // 13
```

The arrow inside uses `extra`, which belongs to the call of `extraScones` that made it. Each call makes a new function with its own `extra`, so `extraScones(1)` and `extraScones(6)` do not get in each other's way.

## Your work in this issue

Open `src/offers.ts`. Type the label callback, name a price rule, type the numbered callback, and write a function that makes price rules. Run `npm run types` and `node src/offers.ts` after each change. Check passes your functions callbacks of its own, and does not accept `any` or `as`.
