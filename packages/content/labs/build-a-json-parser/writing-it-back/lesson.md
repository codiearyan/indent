# Writing it back

## What you will be able to do

Your reader turns JSON text into values and says plainly what is wrong with a text that is not JSON. The last piece goes the other way: turning values back into text, the job of `JSON.stringify`. With both halves written, the shop can read every supplier's list and write one list of its own, with nothing in between that nobody at Ashgrove can explain. By the end of this issue you can:

- write any value JSON can hold as JSON text, escapes included
- refuse the values JSON cannot hold, and say where they sit
- lay the text out with an indent, and run the whole import on your own reader and writer

## The request from Idris

> **Idris:** Every night I copy the three supplier lists into one by hand before the price list runs. I want the import to do it: read every list, put all the items in one file with the supplier beside each, and tell me which lists it could not read and where. And keep that file readable, one thing to a line, because I check it by eye.

Run `node src/try.js`: every line says `Not implemented` for now. `src/import.js` is the new import itself, and it needs `importPrices` in `src/prices.js`.

## Writing is reading backwards

Reading looked at a token and decided what kind of value started there. Writing looks at a value and decides what text it becomes. `null`, `true` and `false` become those words. A number becomes the digits JavaScript would print. An array or an object becomes its brackets around its items, and each item is written by the same function again, so a writer, like a reader, calls itself for whatever sits inside.

A text needs care, because it goes between quotes. A quote inside it would end the text early, so it gets a backslash, and so does the backslash itself, because it starts escapes. Characters below a space, such as a line feed or a tab, may not sit in a JSON text as they are, so they get their escapes back: `\n`, `\t`, or `\u` and four hex digits for the ones without a short form. Every other character goes in as it is, accents and pictures included. A writer that forgets the quote writes text no reader can read, which is how a name like `Kraft "natural"` breaks a whole file.

## What JSON cannot hold

Some JavaScript values have no JSON at all: `undefined`, a function, and the numbers `NaN` and `Infinity`. The built-in writer quietly leaves them out or writes `null` in their place. For a price list that is the worst choice: a price nobody worked out would become a price of nothing, and nobody would hear about it. Your writer throws a `TypeError` instead, and says where the value sits, in the way you would reach it in JavaScript: `items[0].price`.

One more kind of value cannot be written: one that holds itself. Here is the idea for something else, a box that holds a list of what is in it:

```js
const box = { label: 'Spare type', holds: [] }
box.holds.push(box)
```

Writing `box` means writing what it holds, which means writing `box` again, for ever. The fix is to keep a list of the arrays and objects you are inside of right now, adding each on the way in and taking it off on the way out. If a value is already on that list, it holds itself. Keep it to the way in and out, though. The same item can sit in two places side by side, such as one paper in two orders, and that is not a loop: it is simply written twice.

## Lines and indents

Written with no space at all, a whole price list is one long line. Give `stringify` an indent, a number of spaces, and each item and each pair goes on a line of its own, one indent further in than its brackets, with a space after each colon:

```
{
  "code": "KR-120",
  "sizes": [
    "A3",
    "A4"
  ]
}
```

That is the same layout the built-in writer gives for the same indent, so a file your writer makes looks just like one it would make. An empty array or object stays `[]` or `{}`.

## The whole trip

`importPrices` puts it together. It reads each list with your `parse`. A list that throws a `JsonError` becomes a problem, with the file's name, the line and column, and the message, and the import carries on with the next list. Every item of every list that reads goes into one array with its supplier added, and your `stringify` writes `{ items }` with an indent of 2. Only a `JsonError` is a problem with a list: any other error is a bug, and hiding it would be worse than crashing.

## Your work in this issue

Tasks 1 and 2 are `stringify` in `src/json.js`. Task 3 adds the indent to `stringify` and writes `importPrices` in `src/prices.js`. Try your work with:

```sh
node src/try.js
node src/import.js
```

The second writes `data/prices.json` and lists the card supplier's problem by line and column. The check uses values and lists of its own, and reads every text you write back with the built-in reader.
