# One type, shared by files

## What you will be able to do

Until now every issue of this repo was one file, and each type lived beside the code that used it. Real code is spread over files, and two files often need the same type. If each keeps its own copy, the copies drift apart. This issue is about writing a type once, in one file, and using it from others. By the end of it you will be able to:

- export a type from a file
- import it into another file, as a type only
- say what Node erases when it runs a file, and why a type-only import costs nothing
- let the compiler find where two copies of a type had drifted apart

## The request from Bryn

> **Bryn:** Packing and shipping each have their own idea of what an order is. When the order form changed, Rafe fixed the one in packing, and shipping still reads a weight the form no longer sends. Now every parcel costs the top price. I want one order, the same in every file.

The tasks are in three files: `src/order.ts`, then `src/packing.ts`, then `src/shipping.ts`.

## Exporting a type

In the issue on naming shapes you saw that a type alias can have `export` in front, like a function. Here is a bakery's cake, in a file of its own, `src/cake.ts`:

```ts
export type Cake = { flavour: string; layers: number }
```

A file that holds only types is fine. There is nothing in it to run, and it is still the one place where a cake is described.

## Importing a type

Another file, `src/oven.ts` in the same folder, imports it:

```ts
import type { Cake } from './cake.ts'

export function bakeTime(cake: Cake): number {
  return 20 + cake.layers * 10
}
```

The names go in curly braces, then the file. The path starts with `./`, which means the same folder as this file, and it ends with the whole file name. Two mistakes the compiler reports:

- Without `./`, as in `'cake.ts'`, it looks for a package of that name and says `Cannot find module 'cake.ts' or its corresponding type declarations`.
- Without the ending, as in `'./cake'`, it says `Relative import paths need explicit file extensions` and suggests `'./cake.js'`. That is a habit from code that is turned into `.js` files before it runs. In this repo Node runs the `.ts` files themselves, and finds a file only by its real name, so write `'./cake.ts'`. The compiler also lets `'./cake.js'` through, but there is no `cake.js` for Node to find.

If the file still has a copy of `Cake` of its own, the import is refused with `Import declaration conflicts with local declaration of 'Cake'`. One name, one type.

## What Node erases

The word `type` after `import` matters because of how Node runs a `.ts` file. It erases the types, file by file, and runs what is left. It does not read other files to learn what a name is. So it can only erase what says it is a type.

`import type { Cake } from './cake.ts'` says so. Node erases the whole line. When `oven.ts` runs, `cake.ts` is never even opened: the import costs nothing.

`import { Cake } from './cake.ts'`, without `type`, looks like the import of a value. Node keeps it, opens `cake.ts`, finds that its type was erased too, and stops:

```
SyntaxError: The requested module './cake.ts' does not provide an export named 'Cake'
```

In this issue `npm run types` has one more setting, so the compiler says the same before Node does:

```
error TS1484: 'Cake' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.
```

The editor does not have that setting, so it does not underline the line. `npm run types` does, and so does Node.

You may also see `type` inside the curly braces: `import { type Cake } from './cake.ts'`. It erases the name, and keeps the line as an import of nothing, so Node still opens `cake.ts` every time. When a line brings in only types, put `type` right after `import`, and the whole line goes.

## One type, and the copies it replaces

With two copies of a type, each file is checked against its own copy, so each compiles. The compiler cannot see that they disagree. With one shared type, every file is checked against the same one. The moment a file imports it, every line that relied on an old copy is refused, `Property 'weight' does not exist on type 'Order'`, and that line is exactly where the copies had drifted apart. That error is the shared type doing its job.

And the next time the order form changes, there is one type to change, and the compiler points at every line in every file that has to follow.

## Your work in this issue

Open `src/order.ts` and write the type of an order. Then make `src/packing.ts` import it, and fix the import of `src/shipping.ts` and the line it shows. The comments at the top of each file are shared lines; leave them as they are. Run `npm run types`, which checks all three files, and `node src/packing.ts` and `node src/shipping.ts` after each change. Check uses an `order.ts` of its own for the second and third tasks, so each task is judged on its own.
