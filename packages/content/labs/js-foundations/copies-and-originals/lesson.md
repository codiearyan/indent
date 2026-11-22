# Copies and originals

## What you will be able to do

Something odd is happening to the catalogue. Theo opened the sale page to look at prices, and when he went back to the catalogue, the real prices had gone down too. Nobody changed them on purpose. The cause is one of the most important ideas about objects: a variable does not hold an object, it points at one. By the end of this issue you will be able to:

- tell two names for one object from two objects
- explain why changing a "copy" can change the original
- compare two objects by what they hold
- make a copy that shares nothing, and know when one level is not enough

## The request from Theo

> **Theo:** I looked at the sale prices, twenty-five percent off everything, and now the real cedar price is thirteen fifty. I only looked! And Ines asked for a way to put the whole catalogue on sale for a weekend without losing the real prices. I'm scared to touch anything now.

All four tasks are in `src/references.js`.

## Two names, one object

Numbers and text are simple: give one variable's value to another, change the second, and the first stays.

```js
let a = 5
let b = a
b = 6
console.log(a) // 5
```

Objects and lists work differently. Making an object puts it somewhere in memory, and the variable points at it. Giving that variable to another copies the pointer, not the object:

```js
const parcel = { to: 'Noor', weight: 2 }
const box = parcel
box.weight = 9
console.log(parcel.weight) // 9
```

There is one parcel with two names. `box` is not a copy; it is the same parcel. The same is true when you pass an object to a function: the parameter is another name for the caller's object. That is why `sell` in the first issue of this part could change the card it was given.

## Equal or the same

`===` on two objects asks one question: are these two names for the same object?

```js
const one = { to: 'Noor' }
const two = { to: 'Noor' }
one === two // false: two objects that look alike
one === one // true
```

To know whether two objects hold the same things, compare them yourself: the same number of keys, and every key of one in the other with the same value. Comparing only the keys of the first object misses a key that only the second has.

## A copy one level deep

To get a real second object, make a new one. Spread from the last issue does that:

```js
const copy = { ...parcel }
copy.weight = 3
console.log(parcel.weight) // unchanged
```

`copy` is a new object, so changing its properties leaves `parcel` alone. But spread copies each property as it is, one level deep. When a property holds a list or an object, the copy gets a pointer to the same list:

```js
const order = { to: 'Noor', items: ['mug', 'tea'] }
const draft = { ...order }
draft.items.push('spoon')
console.log(order.items) // ['mug', 'tea', 'spoon']
```

`draft` is new, but `draft.items` and `order.items` are one list. To share nothing, give the copy new lists and objects for every property that holds one:

```js
const separate = { ...order, items: [...order.items] }
```

## New lists of old things

The same trap waits with lists of objects. `map` and `[...list]` make a new list, but the objects in it are the same objects:

```js
const marked = orders.map((o) => {
  o.sent = true
  return o
})
```

`marked` is a new list, and every order in the old list now says `sent` too, because they are the same orders. To leave the old ones alone, make a new object for each one inside `map`, with spread.

Changing an object in place is not wrong. Sometimes it is exactly what is asked, as when a card is sold from. The thing to know is which one you are doing, and to make a copy whenever the caller expects their object back as it was.

## Your work in this issue

Open `src/references.js`. Task 1 fixes Theo's sale function. Task 2 compares two cards by what they hold. Task 3 copies a card that holds a list. Task 4 has you write a function of your own and use it to put the whole catalogue on sale without touching it. Run `node src/references.js` after each task and watch the lines that print the shop's own cards. Check makes sure the cards it gives are unchanged. Keep the function names and the last line of the file as they are.
