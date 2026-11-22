# New lists from old

## What you will be able to do

Saturday is market day, and Ines is getting the stall ready from the shelf list. Every job she has is a loop you could write by now: go through the list, make a new one, give it back. These loops are so common that lists come with tools that do the going-through for you. You hand them a small function, a callback like the ones from the last part, and they call it for every item. By the end of this issue you will be able to:

- make a new list with one answer per item, with `map`
- keep only some items, with `filter`
- get the first item that fits, with `find`
- use one after the other, and pick the right one for a job

## The request from Ines

> **Ines:** For the market I need three things from the shelf. Round prices, because nobody wants change for 12.50 in a field. A cheap table at the front with everything under twelve. And the little tag printer only does eight capital letters, so I need to know which names fit. Theo also wants to look up a scent by its first letter when people ask.

All four tasks are in `src/map-filter-find.js`.

## map: one answer per item

`map` calls your function once for each item, in order, and puts every answer in a new list. The new list is always as long as the old one:

```js
const minutes = [3, 5, 4]
const withSteeping = minutes.map((m) => m + 2) // [5, 7, 6]
```

The function gets one item at a time and gives back what that item becomes. You can hand `map` a function you wrote earlier by its name, without round brackets, since `map` is the one that calls it:

```js
function inSeconds(m) {
  return m * 60
}
minutes.map(inSeconds) // [180, 300, 240]
```

An arrow with curly braces needs `return`, as always. Without it each answer is `undefined`, and `map` gives back a list of `undefined`s.

## filter: keep some

`filter` calls your function for each item and keeps the item when the function says true. The new list is as long as the old one or shorter, and holds the items themselves, not the answers:

```js
const teas = ['Earl Grey', 'Mint', 'Jasmine', 'Chai']
teas.filter((tea) => tea.length > 4) // ['Earl Grey', 'Jasmine']
```

The function is a question about one item. It may use names from around it, like a parameter of the function it is written in:

```js
function longerThan(teas, size) {
  return teas.filter((tea) => tea.length > size)
}
```

A common mix-up is `map` where `filter` was meant. `teas.map((tea) => tea.length > 4)` gives `[true, false, true, false]`: one answer per tea, not the teas.

## find: the first that fits

`find` asks the same kind of question, but stops at the first item that passes and gives back that item itself, not a list:

```js
teas.find((tea) => tea.length === 4) // 'Mint'
teas.find((tea) => tea[0] === 'Z')   // undefined
```

When no item passes, you get `undefined`. That is often not what a person should see, so decide what to give back instead. `??`, which you met with `null` and `undefined`, steps in for exactly that case.

## One after the other

`map` and `filter` both give back a list, so you can call the next tool straight on the answer of the first:

```js
teas
  .filter((tea) => tea.length > 4)
  .map((tea) => `Pot of ${tea}`)
// ['Pot of Earl Grey', 'Pot of Jasmine']
```

Read it top to bottom: keep some, then change each. To pick the right tool, ask what the answer should look like. One new value per item is `map`. Some of the items, unchanged, is `filter`. One item is `find`. None of them change the list they are called on; each gives back something new, so the shelf stays as it is.

## Your work in this issue

Open `src/map-filter-find.js`. The shelf and its prices are at the top, in the same order. Task 1 rounds the prices with `map` and a helper you write yourself, Task 2 fills the cheap table with `filter`, Task 3 looks up a scent with `find`, and Task 4 uses `filter` and `map` together for the tags. Each task says which tool to use, and Check makes sure you did. Run `node src/map-filter-find.js` after each task. Check calls your functions with lists of its own. Keep the function names and the export line at the bottom as they are.
