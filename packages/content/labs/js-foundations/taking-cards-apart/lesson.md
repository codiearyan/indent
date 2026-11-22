# Taking cards apart

## What you will be able to do

The catalogue works, and the code that reads it is full of `candle.name`, `candle.priceCents`, `candle.name` again. JavaScript has a short way to pull the parts you need out of an object or a list in one line, and a short way to put them back together into a new one. By the end of this issue you will be able to:

- pull properties out of an object by name, with a default for a missing one
- take a list apart by position
- copy an object and change one property on the copy
- collect "everything else" with rest

## The request from Theo

Theo is getting the catalogue ready for the shop's site.

> **Theo:** I need a tag for every shelf, and some of the old cards never had the size written on them; those are all two hundred grams. Ines wants to try lower prices without touching the real cards. And whatever we do, the site must never show what a candle costs us to make. That number is on every card.

All four tasks are in `src/destructuring.js`.

## Pulling properties out by name

Here is a guest at a small hotel:

```js
const guest = { name: 'Rafa', room: 12, nights: 3 }
```

Destructuring makes variables from its properties in one line. Curly braces on the left of `=` list the keys you want, and each becomes a variable with the same name:

```js
const { name, room } = guest
console.log(name) // 'Rafa'
console.log(room) // 12
```

The names in the braces must match the keys, capital letters included. A name that is not a key gives `undefined`, as reading it with a dot would. You can pull out only what you need and leave the rest.

When a property may be missing, give it a default right after its name:

```js
const { name, breakfast = 'no' } = guest
console.log(breakfast) // 'no', because guest has no breakfast
```

The default is used only when the property is missing or holds `undefined`. A value of `0` or `''` stays.

The same braces work in a function's parameters, which pull the properties out as the function is called: `function roomSign({ name, room }) { ... }`.

## Taking a list apart

Square brackets on the left of `=` take a list apart by position instead of by key:

```js
const arrivals = ['Rafa', 'Noor', 'Ade']
const [firstIn, secondIn] = arrivals
console.log(firstIn) // 'Rafa'
```

This is also the shorter way to read a pair from `Object.entries`, from the last issue:

```js
for (const [room, guestName] of Object.entries({ 12: 'Rafa', 14: 'Noor' })) {
  console.log(`${room}: ${guestName}`)
}
```

## Copying with a change

You met three dots in the part on lists: `[...arrivals]` copies a list. Inside the curly braces of a new object, they copy every property of another object:

```js
const copy = { ...guest }
```

Write a property after the dots and the copy gets that one instead:

```js
const longer = { ...guest, nights: 5 }
// { name: 'Rafa', room: 12, nights: 5 }
console.log(guest.nights) // still 3
```

When a key appears twice, the one written last wins. `{ nights: 5, ...guest }` would copy the old `nights` over your new one. The guest object itself is untouched either way: `longer` is a new object.

## Collecting the rest

Three dots before the last name on the left of `=` collect everything that was not named, into something new:

```js
const [firstIn, ...waiting] = arrivals
console.log(waiting) // ['Noor', 'Ade']
```

With objects it works the same way, and it is the neat way to leave a property out:

```js
const { room, ...withoutRoom } = guest
console.log(withoutRoom) // { name: 'Rafa', nights: 3 }
```

The three dots look the same as spread, but they do the opposite job. On the right of `=`, or inside a new object or list, they spread things out. On the left of `=`, or in parameters, they collect what is left.

Leaving a property out is not the same as setting it to `undefined`: `{ ...guest, room: undefined }` still has a `room` key, and anything that lists the keys will still find it.

## Your work in this issue

Open `src/destructuring.js`. Task 1 pulls properties out of a card, with a default. Task 2 takes a list of names apart. Task 3 copies a card with a new price. Task 4 has you write a function of your own that leaves a property out, and use it for the whole catalogue. Run `node src/destructuring.js` after each task. Check uses cards of its own and makes sure the ones it gives are unchanged. Keep the function names and the last line of the file as they are.
