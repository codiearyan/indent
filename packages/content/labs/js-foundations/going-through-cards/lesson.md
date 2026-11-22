# Going through the cards

## What you will be able to do

Each candle is an object now. One card is easy to read, but the questions Theo and Ines ask are about all of them: how many candles are on the shelf, which scents ran out, what everything is worth. A list you can go through with `for...of`. An object you cannot, at least not directly. This issue shows how to turn an object into a list you can go through, and how to work with a list of objects, which is what most real data looks like. By the end of it you will be able to:

- get the keys, the values, or both out of an object as a list
- go through every property of an object
- build a new object one property at a time
- answer questions about a list of objects

## The request from Ines

Ines counts the shelf every morning and writes the numbers on a sticky note.

> **Ines:** This morning it said cedar four, fig none, amber twelve, sage none. Theo wants the total, I want to know what to pour next, and the site wants a price for every candle in the catalogue. And Theo asked what all the stock is worth, for the insurance. I add it up on my phone and get a different number every time.

All four tasks are in `src/object-loops.js`. The shelf count is one object: each key is a scent, each value a count. The catalogue is a list of cards.

## An object is not a list

Try going through an object the way you go through a list:

```js
const garden = { tomatoes: 6, beans: 0, kale: 3 }

for (const plant of garden) {
  console.log(plant)
}
// TypeError: garden is not iterable
```

"Not iterable" means for...of does not know how to go through it: it goes through lists and text, and an object is neither. Instead, you ask `Object` for a list made from the object, and go through that.

## Keys, values and entries

Three functions each give a new list made from an object:

```js
Object.keys(garden) // ['tomatoes', 'beans', 'kale']
Object.values(garden) // [6, 0, 3]
Object.entries(garden) // [['tomatoes', 6], ['beans', 0], ['kale', 3]]
```

`Object.keys` gives the names, `Object.values` the values, and `Object.entries` both, as pairs. They come in the order the properties were added (keys that are whole numbers, like `12`, are the one exception: they come first, smallest first). They are ordinary lists, so everything from the part on lists works on them: `length`, `for...of`, `map`, `filter`, `find`. The object itself is not changed.

Use the one that holds what you need. To count how many kinds of plant there are, `Object.keys(garden).length` is enough. To add up the plants, you only need the values:

```js
let plants = 0
for (const count of Object.values(garden)) {
  plants = plants + count
}
```

When you need the key and its value together, go through the entries. Each entry is a small list of two: the key at index `0` and the value at index `1`:

```js
for (const entry of Object.entries(garden)) {
  console.log(`${entry[0]}: ${entry[1]}`)
}
```

There is a shorter way to write `entry[0]` and `entry[1]`; it comes in the next issue. `Object.keys` with brackets works as well: `garden[key]` reads the value of each key.

## Building an object as you go

Brackets do not only read; they also add. Start with an empty object and give it a property for each thing you meet, with a key that comes from your data:

```js
const harvest = [
  { plant: 'tomatoes', kilos: 4 },
  { plant: 'kale', kilos: 1 }
]

const byPlant = {}
for (const row of harvest) {
  byPlant[row.plant] = row.kilos
}
// { tomatoes: 4, kale: 1 }
```

`byPlant[row.plant]` uses the text inside `row.plant` as the key. `byPlant.row` or `byPlant.plant` would make a property with that word itself as its name, every time, and each row would overwrite the last.

## A list of objects

The harvest above is a list of objects. That shape is everywhere: orders, customers, products, rows from a file. Each item has the same keys, and you go through the list with what you know, reading each item's properties with a dot:

```js
const heavy = harvest.filter((row) => row.kilos > 2)

let kilos = 0
for (const row of harvest) {
  kilos = kilos + row.kilos
}
```

A small function for one item keeps the bigger one short. If `rowWorth(row)` works out one row, a total is that function called for every row and added up.

## Your work in this issue

Open `src/object-loops.js`. Tasks 1 and 2 answer questions about the shelf object. Task 3 builds a new object from the catalogue. Task 4 has you write a function for one card and use it for the whole list. Run `node src/object-loops.js` after each task. Check uses shelves and lists of its own, empty ones included, and makes sure the ones it gives are unchanged. Keep the function names and the last line of the file as they are.
