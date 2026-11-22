# A list for the shelf

## What you will be able to do

Every value you have used so far holds one thing: one price, one scent, one answer. The shop is full of things that come in a row. The scents on the shelf behind the counter, the amounts the till rang up today, the orders waiting to be packed. A value that holds many things in order is called an array, or a list, and it opens a new part of this repo. By the end of this issue you will be able to:

- make a list and read any item of it by its position
- add an item at the end of a list and take one off
- ask whether a list holds something, and where
- go through every item of a list with `for...of`

## The request from Ines

> **Ines:** I keep the shelf in my head. Cedar on the left, then Sage, then the smoked fig, then Lavender. When we sell out of something I move the rest along, and when Theo asks where the Sage is I have to go and look. And at closing time I add up the till by hand, minus the refunds. Can the laptop keep the shelf for me?

All five tasks are in `src/arrays.js`.

## A list in square brackets

You write a list with square brackets and commas between the items:

```js
const teas = ['Earl Grey', 'Mint', 'Jasmine']
const cupsPerHour = [12, 30, 18, 9]
const nothingYet = []
```

Each item has a position, counted from 0. You read an item by writing its position in square brackets after the list:

```js
teas[0] // 'Earl Grey'
teas[2] // 'Jasmine'
teas[7] // undefined
```

Asking for a position the list does not have is not an error. You get `undefined`, quietly, so a wrong position can travel a long way before something breaks. A common place for it to break is a method called on that `undefined`: `teas[7].toUpperCase()` stops with `TypeError: Cannot read properties of undefined (reading 'toUpperCase')`. When you see that, look at the position you read.

`length` tells you how many items a list has, just as it does for text, and like for text it has no round brackets. `teas.length` is `3`. Because positions start at 0, the last position is always one less than the length, and that is how you find the last item of a list of any size.

## Adding and taking at the end

A list can grow and shrink. `push` adds an item at the end, and `pop` takes the last item off and gives it back:

```js
const queue = ['Mira', 'Oskar']
queue.push('Lena')         // queue is now ['Mira', 'Oskar', 'Lena']
const next = queue.pop()   // next is 'Lena', queue is ['Mira', 'Oskar']
```

These change the list itself. That works even though `queue` is a `const`: `const` means the name always points at the same list, not that the list can never change. Every call of `pop` takes one more item off, so call it once and keep what it gives back. On an empty list, `pop` takes nothing and gives back `undefined`.

You can also put a value at a position: `queue[0] = 'Ada'` replaces the first item.

## Is it there, and where?

`includes` answers true or false:

```js
teas.includes('Mint')   // true
teas.includes('Rooibos') // false
```

`indexOf` gives back the position of an item, the first one if it is there more than once. When the item is not there at all, it gives back `-1`, a position no list ever has:

```js
teas.indexOf('Jasmine') // 2
teas.indexOf('Rooibos') // -1
```

Ask about `-1` exactly. The first item is at position `0`, and `0` counts as false in an `if`, so `if (teas.indexOf(tea))` gets the first item wrong.

## Going over a list

`for...of` works on lists just as it does on text. It hands you each item in turn, from the first to the last:

```js
let cups = 0
for (const count of cupsPerHour) {
  cups += count
}
// cups is 69
```

`cups += count` is short for `cups = cups + count`. Give the total its starting value before the loop: a `let` with no value is `undefined`, and `undefined` plus a number is `NaN`. Give the answer back after the loop, not inside it, or the function ends in the first round.

When you need the position too, the counting loop from the issue on loops works on lists as well, with `teas.length` in its condition and `teas[i]` inside.

## Your work in this issue

Open `src/arrays.js`. Today's shelf is the list at the top. Tasks 1 to 4 read the shelf, add to it, sell from it and find a scent on it. Task 5 adds up the till, and you write a small helper for it from scratch. Run `node src/arrays.js` after each task: the demo lines change today's shelf as they go, the way a real day would. Check calls your functions with shelves and days of its own. Keep the function names and the last line of the file as they are.
