# Make the compiler strict

## What you will be able to do

Every issue so far ran the compiler with its checks fully on. That was a choice, written into `npm run types`, and a project can choose otherwise. Projects keep these choices in a file, `tsconfig.json`, and a project in a hurry often switches checks off to make errors go away. The errors go; the bugs stay. By the end of this issue you will be able to:

- read and change the settings in a `tsconfig.json`
- switch on `noImplicitAny` and `strictNullChecks`, one at a time, and fix what each finds
- say what `strict` turns on, and read a value that was thrown
- go one step further with `noUncheckedIndexedAccess`

## The request from Bryn

> **Bryn:** Rafe says the stock code compiles without a single error. Yesterday the reorder list told me to order NaN tins of Frost Sencha, and when I asked for the tins of a blend we have no shelf for, it stopped with an error. If the compiler is meant to catch this, why is it quiet?

The tasks are in `tsconfig.json` and `src/stock.ts`.

## tsconfig.json

A `tsconfig.json` holds the compiler's settings, so they need not be typed into every command. In this issue `npm run types` is `tsc --noEmit -p tsconfig.json`: check the files the settings name, with those settings.

```json
{
  "compilerOptions": {
    "target": "es2022",
    "noImplicitAny": true
  },
  "include": ["src"]
}
```

The settings go inside `compilerOptions`, each a name in double quotes, a colon, and a value, with commas between them. `true` and `false` have no quotes. `include` names the folder of files to check. The compiler reads the file before anything else, and stops on a mistake in it:

- `Unknown compiler option 'noImplicitAnys'.` A name spelt differently from the real one is not a setting at all. Copy names exactly, capitals included.
- `Compiler option 'noImplicitAny' requires a value of type boolean.` The value was `"true"`, text, not `true`.

In the TypeScript of this repo, every strict check is on unless a `tsconfig.json` switches it off. Rafe's has `"strict": false`, and that is why nothing is reported.

The editor in this app does not read `tsconfig.json`. It underlines with every check of `strict` on from the start, and without `noUncheckedIndexedAccess`, so in this issue its underlines and `npm run types` disagree. Go by what `npm run types` prints.

## noImplicitAny

With `noImplicitAny` off, a parameter without a type quietly becomes `any`, and anything goes. On, the compiler asks for its type:

```ts
function perGuest(cake, guests) {
  return cake.slices / guests
}
```

```
error TS7006: Parameter 'cake' implicitly has an 'any' type.
```

You met this message in the issue on `any`. Write the types, and the compiler can check the body against them, which is often where the real bug was.

## strictNullChecks

With `strictNullChecks` off, `null` and `undefined` fit in every type: a `string` may secretly be `undefined`. On, they are values of their own, and the compiler tracks where they can appear:

```ts
function slicesOf(cakes: Cake[], flavour: string): number {
  const cake = cakes.find((c) => c.flavour === flavour)
  return cake.slices
}
```

```
error TS18048: 'cake' is possibly 'undefined'.
```

`find` gives `undefined` when nothing matches, so check before reading, as in the issue on narrowing. A function that may give back `undefined` must say so: `return undefined` from a function typed `: string` is refused with `Type 'undefined' is not assignable to type 'string'.` Write `string | undefined`.

## What strict turns on

`strict` is one switch for eight checks: `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `strictBuiltinIteratorReturn`, `noImplicitThis` and `useUnknownInCatchVariables`. A check named on its own wins over `strict`, so `"strict": true` with `"noImplicitAny": false` still leaves that one off.

One you will meet now is `useUnknownInCatchVariables`. JavaScript can throw anything, not only an `Error`: a string, a number. So the value a `catch` receives is `unknown`:

```ts
try {
  return JSON.parse(text).flavour
} catch (error) {
  return error.message
}
```

```
error TS18046: 'error' is of type 'unknown'.
```

`instanceof` narrows it, the way `typeof` does: inside `if (error instanceof Error)`, it is an `Error`, and `error.message` is text. Writing `catch (error: Error)` is refused, `Catch clause variable type annotation must be 'any' or 'unknown' if specified`, because the compiler cannot promise that.

## One step further

In the issue on lists, `flavours[7]` had the type `string` as far as the compiler knew, and was `undefined` when Node ran it. `noUncheckedIndexedAccess`, which `strict` does not turn on, closes that gap: an item read from a list by its position may be `undefined`.

```ts
const flavours = ['lemon', 'plum']
console.log(flavours[7].toUpperCase())
```

```
error TS2532: Object is possibly 'undefined'.
```

Checking `flavours.length` first does not help: the compiler does not connect a length with an item. Read the item into a `const` and check that. The setting only matters with `strictNullChecks` on, since without it `undefined` fits everywhere anyway.

## Your work in this issue

Open `tsconfig.json` and `src/stock.ts`. For each task, switch one setting on, run `npm run types`, and fix what it finds under that task's comment. `Shelf` at the top is shared; leave it as it is. Run `node src/stock.ts` too. Go by `npm run types`, not the editor's underlines: only the command reads your settings. Check reads your `tsconfig.json` the way the compiler does, and compiles your code with it and with its own settings, so a setting switched off again to quiet an error does not pass.
