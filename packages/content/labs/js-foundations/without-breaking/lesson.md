# Changing without breaking

## What you will be able to do

The shelf is a list now, and the laptop keeps it. Theo has started using it too, for the newsletter, and something strange is happening: after his code runs, the shelf list comes out wrong. Nobody changed it on purpose. The cause is one of the most important ideas about lists, and once you see it, you will see it everywhere. By the end of this issue you will be able to:

- tell changing a list apart from making a new one
- explain why two names can share one list
- copy a list, or a part of it, with `slice` and with the spread form `...`
- write functions that leave the lists they are given alone

## The request from Theo

> **Theo:** I made the newsletter labels from the shelf list. "Wickhollow Cedar", "Wickhollow Sage" and so on. It worked. But afterwards Ines printed the shelf and every scent had Wickhollow in front of it. I never touched the shelf! At least I don't think I did.

All four tasks are in `src/copies.js`.

## Two names, one list

With a number, `=` makes a copy. Change one name and the other stays put:

```js
let cups = 3
let moreCups = cups
moreCups = 5
// cups is still 3
```

A list works differently. `=` does not copy the list, it gives the same list a second name:

```js
const menu = ['Mint', 'Jasmine']
const special = menu
special.push('Rooibos')
// menu is ['Mint', 'Jasmine', 'Rooibos'] too
```

There is only one list here, with two names pointing at it. Anything that changes it through one name shows through the other. `push`, `pop` and putting a value at a position, like `special[0] = 'Chai'`, all change the list itself.

You can see the difference with `===`. On lists it asks "is this the very same list?", not "do these hold the same items?". `special === menu` is `true`. But `['Mint'] === ['Mint']` is `false`: two lists that happen to look alike.

## Functions get the same list

The same thing happens when you hand a list to a function. The parameter is one more name for the caller's list:

```js
function addHoney(order) {
  order.push('Honey')
  return order
}

const table4 = ['Mint']
const withHoney = addHoney(table4)
// table4 is now ['Mint', 'Honey'] as well
```

The function did what it said, and it also changed the order of table 4 behind the caller's back. In a small file you might notice. In a shop, where the shelf is used by the till, the newsletter and the labels, a function that changes the list it was given breaks something far away. A good rule: a function does not change a list it was handed, unless that is its whole job and its name says so. It gives back a new list instead.

## Making a copy

`slice` makes a new list from part of an old one, and leaves the old one alone. It takes where to start and where to stop. The item at the stop position is not included:

```js
const teas = ['Earl Grey', 'Mint', 'Jasmine', 'Chai']
teas.slice(1, 3) // ['Mint', 'Jasmine']
teas.slice(0, 2) // ['Earl Grey', 'Mint']
teas.slice(2)    // ['Jasmine', 'Chai'], to the end
teas.slice()     // a copy of the whole list
```

A stop past the end is no error, it just stops at the end. And `slice` always gives a new list, even when it keeps every item.

The spread form, three dots in front of a list inside square brackets, lays out its items in a new list. You can add more items around them:

```js
const copy = [...teas]
const longer = [...teas, 'Rooibos']
const both = ['Water', ...teas]
```

Without the dots, `[teas, 'Rooibos']` makes a list of two items, the first one a whole list.

Once you have a copy, you may change it as much as you like with `push` or `pop`: only the copy changes.

## Building a new list in a loop

Sometimes the new list is not a part of the old one but made from it, one item at a time. Start with an empty list, fill it in a loop, and give it back:

```js
function cupsFor(teas) {
  const cups = []
  for (const tea of teas) {
    cups.push(`A cup of ${tea}`)
  }
  return cups
}
```

`push` is fine here, because `cups` is a list the function made itself. The list it was handed is only read.

## Your work in this issue

Open `src/copies.js`. Tasks 1 to 3 each give back a new list made from the shelf: one with a scent more, one with only the first few, one without the last. Task 4 fixes Theo's labels, with a helper you write yourself. Run `node src/copies.js` often: its last line prints the shelf after everything else has run, so you can see whether it survived. Check hands your functions lists of its own and looks at them afterwards. Keep the function names and the export line at the bottom as they are.
