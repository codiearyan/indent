# Counts and no repeats

## What you will be able to do

Objects have done a lot of work in this part: cards, shelf counts, price lists. Two jobs keep coming back that objects do clumsily. One is keeping a count for each thing as you meet it. The other is keeping a group of things where each may appear only once. JavaScript has a tool made for each: a `Map` and a `Set`. By the end of this issue you will be able to:

- make a Map, write entries into it and read them back
- count things with a Map, and go through its entries
- say when a Map is a better choice than an object
- keep values without repeats in a Set, and turn it back into a list

## The request from Ines

It is Friday, and Ines has the week's sales on the screen: one scent for every candle that went out.

> **Ines:** I want to know how many of each scent we sold, and which one sold best, so I know what to pour on Monday. Theo wants every scent we sold, once, for the newsletter. And we'd like to send a thank-you note to customers who are new this week, but people type their emails differently every time.

All four tasks are in `src/maps-and-sets.js`.

## A Map holds entries

A Map is made with `new Map()` and works through its own methods:

```js
const visits = new Map()
visits.set('Noor', 2)
visits.set('Ade', 1)

visits.get('Noor') // 2
visits.get('Rafa') // undefined: no entry for Rafa
visits.has('Ade') // true
visits.size // 2
visits.delete('Ade')
```

`set` writes an entry, overwriting one with the same key. `get` reads one and gives `undefined` when there is none. Node prints a Map as `Map(2) { 'Noor' => 2, 'Ade' => 1 }`.

Brackets and dots do not reach a Map's entries. `visits['Noor'] = 3` puts an ordinary property on the Map object, beside its entries, and `get` never sees it. For the same reason `Object.keys` and `Object.entries` find nothing in a Map: the entries are not properties.

## Counting with a Map

Counting is the job a Map does best. For each thing, read its count so far, add one and write it back. The first time a thing comes up there is no count yet, so start it from 0:

```js
const counts = new Map()
for (const word of ['tea', 'cake', 'tea']) {
  counts.set(word, (counts.get(word) ?? 0) + 1)
}
// Map(2) { 'tea' => 2, 'cake' => 1 }
```

Without the `?? 0`, the first `get` gives `undefined`, and `undefined + 1` is `NaN`.

## Going through a Map

for...of goes straight through a Map, entry by entry, in the order the keys were first added. Each entry is a pair, so the destructuring from earlier in this part fits:

```js
for (const [word, count] of counts) {
  console.log(`${word}: ${count}`)
}
```

`counts.keys()` and `counts.values()` go through only the keys or only the values.

## When a Map beats an object

An object can count too, so why a Map? An object's keys are always text: `{}` given the key `200` stores `'200'`, and `1` and `'1'` become the same key. A Map keeps any value as a key, numbers and even objects included, exactly as given. A Map knows its `size`, keeps its order, and has no keys of its own that you did not put there. Use an object for a thing with known parts, like a card. Use a Map when the keys come from your data and you add them as you go.

## A Set has no repeats

A Set is a group of values where each appears once. Adding a value that is already there does nothing:

```js
const guests = new Set()
guests.add('Noor')
guests.add('Ade')
guests.add('Noor')
guests.size // 2
guests.has('Ade') // true
```

A Set can be made straight from a list, which drops the repeats and keeps the first time each appears. A Set is not a list, though: it has no index, no `map`, no `filter`. To get a list back, spread it inside square brackets:

```js
const names = [...new Set(['Noor', 'Ade', 'Noor'])] // ['Noor', 'Ade']
```

`has` on a Set is quick however many values it holds, which makes it the natural place to keep things you will ask about again and again, such as who you already know. Values are compared exactly: `'Noor'` and `'noor'` are two different values to a Set, so tidy text before you add it.

## Your work in this issue

Open `src/maps-and-sets.js`. Task 1 counts the week's sales in a Map, and Task 2 finds the best seller in such a Map. Task 3 lists every scent once with a Set. Task 4 has you write a function of your own that tidies an email, and use it with Sets to find the new customers. Run `node src/maps-and-sets.js` after each task. Check uses lists and Maps of its own. Keep the function names and the last line of the file as they are.
