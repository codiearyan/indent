# Code in more than one file

## What you will be able to do

Every file you opened in this repo ended with a line that started with `export`, and every lesson asked you to leave it alone, with a promise that what it means comes later. This is later. Real programs are not one long file. They are many small files, each about one thing, that use each other's functions. By the end of this issue you will be able to:

- share a function from one file with `export`, in both of the ways it is written
- use it in another file with `import`
- write the path to a file beside the one you are in, and say why it looks the way it does
- read the errors Node gives when an import goes wrong

## The request from Ines

> **Ines:** A customer wrote in, a bit confused. The label on the stall said the amber candle was 18.5 EUR, and Theo's email to her said 18.50. Theo says the labels have their own copy of the price code, an old one. Can there be one price code that everything uses? Theo wants his order emails to use it too, so he can stop typing prices by hand.

Two copies of the same code drift apart. Someone fixes one and forgets the other, and now the shop shows two prices for one candle. The way out is to keep the price code in one file and let every other file use it from there.

## Each file keeps its names to itself

A file of JavaScript that Node runs is called a module. The names made in a module, its functions and its variables, belong to that module. Another file cannot see them, even when the two sit in the same folder. That is a good thing: a helper called `round` in one file cannot clash with a different `round` in another.

To let other files use something, the module has to say so. Take a bakery that keeps its weights in `src/weights.js`:

```js
function toKilos(grams) {
  return grams / 1000
}

function roundToTen(grams) {
  return Math.round(grams / 10) * 10
}

export { toKilos }
```

The last line is an export line. It names, in curly braces, what this file shares. `toKilos` can now be used by other files. `roundToTen` stays inside: no other file can reach it.

There is a second way to write the same thing. Put `export` in front of the function itself:

```js
export function toKilos(grams) {
  return grams / 1000
}
```

Both mean the same. An export line keeps every shared name together at the bottom; `export` in front tells you on the spot. The export line at the bottom of every file in this repo shared your functions with Check and with the flow, which load your file from files of their own.

## Bringing a name in

The file that wants `toKilos` asks for it with an import line, usually at the very top:

```js
import { toKilos } from './weights.js'

console.log(toKilos(1500)) // 1.5
```

The names in curly braces must match the export of the other file exactly, capital letters included. One import line can bring in several names, with commas between them. Once imported, `toKilos` is used as if it had been written in this file.

Importing a file runs its top-level lines once. That is why a file that is shared usually only makes functions and values, and does not print: anything it printed would appear in every program that imports it.

## The path to the file

`'./weights.js'` says where the file is, and each part matters.

- `./` means "in the same folder as this file". Without it, Node does not look for a file at all: it looks for a package, code that was installed for the project.
- `weights.js` is the whole name of the file, `.js` included. Node does not guess the end of a name.

## When an import goes wrong

Each mistake has its own error, and each one names the line and the file. Asking for a name the other file does not export:

```
file:///Users/you/workspace/src/recipe.js:1
import { tokilos } from './weights.js'
         ^^^^^^^
SyntaxError: The requested module './weights.js' does not provide an export named 'tokilos'
```

Check the spelling against the export line of `weights.js`, and that it is exported at all. Leaving out the `./`:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'weights.js' imported from /Users/you/workspace/src/recipe.js
```

"Package" is the clue: Node went looking for something installed. Leaving out the `.js`:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/you/workspace/src/weights' imported from /Users/you/workspace/src/recipe.js
```

Read the path to the end: Node looked for a file called exactly `weights`, and there is none. The same error comes for a file name that is misspelt.

## Your work in this issue

Three files this time. Task 1 is in `src/money.js`: write its export line yourself. Tasks 2 and 3 are in `src/labels.js`: import the price code in place of the old copy, then write the sale label with `export` in front. Task 4 is `src/emails.js`, which you write whole. Run `node src/labels.js` and `node src/emails.js` as you go. Check calls your functions with candles of its own, and puts a `money.js` of its own beside your files to make sure the prices really come from there.
