# Splitting a file that grew

## What you will be able to do

In the last issue the price code got a file of its own, and two other files imported it. The shop's site is the opposite story: it started as a few lines, and everything new went into the same file. Now it is too long to find anything in. In this issue you split it up, and learn how to decide what goes where. By the end of it you will be able to:

- move functions into files by what they are about
- keep data in a file of its own
- have one file import from two others, and know which file needs which import
- read a default export, and import it

## The request from Theo

> **Theo:** The site is one file and I scroll up and down all day. Ines wanted to change when a candle counts as low, and she could not find where. And the settings file that came with the site already has that number in it, but nothing reads it. Can you tidy it up before it gets any longer?

All four tasks move code out of `src/shop.js`. At the end it keeps only what runs the site.

## A file for each thing

Split a file by what the code is about, not by its length. Take a tea room whose code is one file. Its parts are easy to name: the menu, which is data; the prices, which are rules; and the till, which uses both. Each gets a file:

```
src/menu.js     the list of teas
src/prices.js   what a tea costs
src/till.js     the bill, built from both
```

Every file has the same shape: its imports at the top, then what it makes, and an export of what other files need. When a part has a small helper that only it uses, the helper moves with it and is not exported, the way `twoDigits` stayed inside `money.js`.

Name the file after what is in it. When someone wants to change a price, `prices.js` is where they look, and it holds nothing else.

## Data in its own file

A list or an object is exported like a function:

```js
export const menu = [
  { name: 'Mint', priceCents: 350 },
  { name: 'Chai', priceCents: 420 }
]
```

Data changes more often than the code that uses it. In a file of its own, a new tea is one line in one place, and nobody has to read the till's code to add it.

## One file importing from two

The till needs the menu and the prices, so it has two import lines, one for each file:

```js
import { menu } from './menu.js'
import { teaPrice } from './prices.js'
```

A file that is imported can import too: `prices.js` could import from a file of its own. Each file imports what it uses itself. An import in one file does nothing for another, even when that one is imported right next to it.

When a function moves and a file that uses it was not given the import, the error says so:

```
file:///Users/you/workspace/src/till.js:4
  return teaPrice(name) * cups
  ^

ReferenceError: teaPrice is not defined
    at bill (file:///Users/you/workspace/src/till.js:4:3)
    at file:///Users/you/workspace/src/till.js:7:13
```

Now the `at` lines help. The first says the error happened inside `bill`, at line 4 of `till.js`; the next says what called `bill`, line 7. `till.js` uses `teaPrice` and does not import it.

## A default export

Some files share one main thing, and write it with `export default`:

```js
export default { opens: 8, closes: 17 }
```

A default export has no name of its own. The file that imports it chooses one, and writes it without curly braces:

```js
import hours from './hours.js'

console.log(hours.opens) // 8
```

Braces ask for a named export, and this file has none, so `import { opens } from './hours.js'` stops with `does not provide an export named 'opens'`. You will meet default exports in code that others wrote, like the settings of the shop's site. This repo writes named exports, because a named export has the same name in every file that uses it.

## Moving code without breaking it

Move one part at a time, and run the site after each move: it should print the same page as before. Cut, do not copy. A copy left behind is how the labels got their own price code last time. When the site stops, read the first error and the file it names.

## Your work in this issue

Open `src/shop.js` and read it top to bottom first. Task 1 moves the candles to `src/catalogue.js`. Task 2 moves the stock rules to `src/stock.js`, and Task 3 has them read `src/settings.js`. Task 4 moves the page to `src/page.js`. Run `node src/shop.js` after every move. Check puts files of its own beside each of yours, other candles and other settings, to make sure every file uses the others and keeps no copies.
