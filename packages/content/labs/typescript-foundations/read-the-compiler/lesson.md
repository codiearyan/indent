# Read the compiler

## What you will be able to do

Oakhollow Tea Company sells loose tea online from a small shop with a packing table at the back. Its order code was written by Rafe in a hurry, in plain JavaScript, and it goes wrong in quiet ways: a count that looks like a phone number, a weight that is `NaN`. Imogen, who owns the shop and blends the tea, has heard that TypeScript catches this kind of mistake before an order goes out. You know JavaScript; in this repo you learn to write types for it, from the first one. This first issue is about reading. By the end of it you will be able to:

- run a TypeScript file with Node, and say what Node does with its types
- ask the compiler to check the file, and say what it does and does not do
- read a type error part by part: where, what kind, and what was promised
- fix the code a type error points at, not the type

## The request from Imogen

> **Imogen:** I gave Rafe's order sheet some types last night, the way the guide said. It still runs, and it still prints nonsense. Then I ran the other command and it printed a page of red I could not follow. Can you read it for me and fix what it found?

All four tasks are in `src/order-sheet.ts`.

## JavaScript with types

TypeScript is JavaScript with one thing added: you may write, next to a name, what kind of value it holds. That is a **type annotation**, a colon and a type after the name:

```ts
const sconesBaked: number = 30
```

A type is a set of values. `number` is every number, `string` is every piece of text, `boolean` is `true` and `false`. The annotation is a promise: this name will only ever hold a number. Function parameters get them too, and so does the result, after the round brackets:

```ts
function trayLabel(flavour: string, count: number): string {
  return `${count} ${flavour} scones`
}
```

Everything else is the JavaScript you know.

## Two programs, two jobs

Two programs read a `.ts` file, and they do different jobs.

**Node runs it.** Node removes the annotations and runs what is left, which is plain JavaScript. It does not look at the types at all. So a file whose types are wrong still runs, and still does the wrong thing:

```ts
const sconesBaked: number = '30'
const sconesSold = 18
console.log('Scones left:', sconesBaked - sconesSold)
console.log('Baked today:', sconesBaked + 6)
```

`node src/scones.ts` prints `Scones left: 12`, which looks right, and then `Baked today: 306`, because `+` glues text together. The promise said number; the value was text.

**The compiler checks it.** The compiler, `tsc`, reads the whole file and compares every value with every promise. It runs nothing. In this repo you start it with `npm run types`. npm first prints the command it runs; after that, when the promises hold, the compiler prints nothing at all. When one is broken, it prints a type error:

```
src/scones.ts:1:7 - error TS2322: Type 'string' is not assignable to type 'number'.

1 const sconesBaked: number = '30'
        ~~~~~~~~~~~


Found 1 error in src/scones.ts:1
```

Types only exist while the compiler reads your code. Once Node runs it, they are gone. That is why you need both commands: Node to see what the code does, the compiler to see what it promised.

## Reading a type error

**The first line says where, and what.** `src/scones.ts:1:7` is the file, the line and the column: line 1, seventh character. Then `error TS2322`, a code you can search for, then the message.

**The copy of the line has marks under it.** The row of `~` sits under the part the error is about. Here it is the name that made the promise.

**The message has a shape you will see all the time.** `Type 'string' is not assignable to type 'number'` reads: a `string` was given where a `number` was promised. "Assignable" means "allowed to go in".

**The last line counts.** The compiler shows every error in the file at once, not one at a time. Start with the first.

A few more messages you will meet in this issue, with the scone code:

- `Property 'flavor' does not exist on type '{ flavour: string; count: number; }'. Did you mean 'flavour'?` The code asked an object for something it does not have. The part in curly braces is the object's type, every property it has, and the compiler often guesses what you meant.
- `Argument of type 'number' is not assignable to parameter of type 'string'.` A value passed to a function does not fit the parameter that receives it.
- `Expected 2 arguments, but got 1.` A call passed too few values. An indented note under the error, with a line of its own, names the parameter that got nothing.

The editor underlines the same mistakes in red, and pointing at the underline shows the same message. The terminal is still the place to read them all in a row.

## Fix the code, not the type

When a value and a promise disagree, either could be wrong. Here the types were written last, on purpose, to say what the code was meant to do: a count is a number, a label has the blend first. So the fix is in the line the error points at. Changing the type until the error goes away makes the compiler quiet and keeps the bug.

## Your work in this issue

Open `src/order-sheet.ts`. The lines at the top, above `// Task 1`, are shared by every task; leave them as they are. Each task has one line the compiler refuses. Run `node src/order-sheet.ts` to see what goes wrong, run `npm run types` to read why, fix the line and run both again. When the compiler prints nothing and the sheet makes sense, you are done.
