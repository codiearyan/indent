# Types that follow other types

## What you will be able to do

So far every type in this repo was written out property by property. That is fine for the first type of a thing. It goes wrong for the second: a type that is "the same as Tin, but..." and was copied by hand. The day the first type changes, the copy does not, and nothing says so. This issue is about making a type from another type, so it follows it. By the end of it you will be able to:

- make a type of the names of an object's properties, with `keyof`
- read the type of one property, with square brackets
- make every property optional, with `Partial`
- keep only some properties, or all but some, with `Pick` and `Omit`

## The request from Imogen

> **Imogen:** Next month we start selling 500 g tins. Last time we added a size, Rafe changed the type of a tin and forgot the three other types that copy it, so the stock form refused the new tins for a week. I want to change a tin in one place and have everything else keep up.

All four tasks are in `src/catalogue.ts`.

## The names of the properties

Here is a type for a cake at a bakery, and a function that reads one property by its name:

```ts
type Cake = { flavour: string; layers: number; tier: 1 | 2 | 3; price: number }

function show(cake: Cake, field: string): string {
  return String(cake[field])
}
```

```
error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type 'Cake'.
  No index signature with a parameter of type 'string' was found on type 'Cake'.
```

Square brackets with a name read a property, as in JavaScript. But `field` could be any text, `'colour'` too, and a cake has no colour. The compiler wants a type that allows only the names a cake has.

You could write them out: `'flavour' | 'layers' | 'tier' | 'price'`. It compiles, and it is a copy. **`keyof`** makes that union from the type itself:

```ts
type CakeField = keyof Cake
```

`keyof Cake` is exactly `'flavour' | 'layers' | 'tier' | 'price'`, today. Add a property to `Cake` and its name is in `CakeField` too, with nothing else to change. A name a cake does not have is refused: `Type '"colour"' is not assignable to type 'keyof Cake'`.

## The type of one property

The same square brackets work on types. **`Cake['tier']`** is the type of the `tier` property of `Cake`: `1 | 2 | 3`. The name goes in quotes, because it is the name of the property as text.

```ts
type Tier = Cake['tier']

function cakesOfTier(cakes: Cake[], tier: Tier): Cake[] {
  return cakes.filter((cake) => cake.tier === tier)
}
```

Why not write `number`? It compiles, and it allows `cakesOfTier(cakes, 4)`, which finds nothing and says nothing. `Tier` refuses it: `Type '4' is not assignable to type '1 | 2 | 3'`. And when the bakery adds a fourth tier to `Cake`, `Tier` allows it without being touched.

## Every property optional

Some code takes a few properties of a thing, any of them. A change to a cake might be a new price, or a new price and a new flavour. **`Partial<Cake>`** is `Cake` with a question mark on every property, each keeping its type:

```ts
function changeCake(cake: Cake, changes: Partial<Cake>): Cake {
  return { ...cake, ...changes }
}

changeCake(lemon, { price: 450 })
```

`Partial` takes a type in angle brackets, like `Array<number>`, and gives a new type. A change to a property a cake does not have is still refused, `Object literal may only specify known properties`, and so is a price as text.

Inside, `...` copies the properties of one object into a new one, and a later property wins over an earlier one. The cake that was passed in is not changed.

## Some properties, or all but some

**`Pick<Cake, 'flavour' | 'tier'>`** keeps only the properties you name. **`Omit<Cake, 'price'>`** keeps all of them but the ones you name. Both give a new type, and both follow `Cake`.

Which one to use depends on what the type means, not on which is shorter today:

- A box label shows the flavour and the tier, whatever else a cake gets later. That is `Pick`: name what it keeps.
- A cake on the order form has everything a cake has except the price, which the bakery sets. That is `Omit`: name what it leaves out. When `Cake` gets a new property, the form should ask for it too.

Written the other way round, each compiles today and goes wrong the day `Cake` changes.

`Pick` checks its names: `Pick<Cake, 'colour'>` is refused with `does not satisfy the constraint 'keyof Cake'`. `Omit` does not. A misspelt name in `Omit` leaves nothing out, without a word, so read it twice.

## Your work in this issue

Open `src/catalogue.ts`. `Tin` at the top is shared by every task; leave it as it is. Name the properties of a tin, read the type of its size, write `updateTin` whole, and make Rafe's two copies of `Tin` from `Tin`. Run `npm run types` and `node src/catalogue.ts` after each change. Check also changes `Tin` in its own copy and looks at whether your types followed, so a type written out by hand does not pass, even when it is right today.
