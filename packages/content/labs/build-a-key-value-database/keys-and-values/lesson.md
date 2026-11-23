# Keys and values

## What you will be able to do

You have used a database: you put something in, and later, even after the program stopped, it is still there. In this repo you write a small one yourself, in plain JavaScript on Node's own file functions, so you know what a database does to keep that promise. This first issue builds the part every database has at its heart: a place that keeps values under keys. By the end of it you can:

- open a store and keep text values under text keys
- tell a key that is not there from a key whose value is empty
- take any text as a key, and refuse anything that is not text

## The request from Hesper

Ashgrove Press is a letterpress shop with two old presses, run by Hesper. Sefton works the counter and writes the small programs the shop runs on; Idris keeps the books, the price list and the stock counts.

> **Hesper:** Twice now the power went while the stock script was saving, and twice `stock.json` came back half empty. Idris spent a morning counting card by hand. I do not want a cleverer file. I want a store that cannot lose what it already had, and code that someone here can explain line by line.

Open `src/old-stock.js`. Every change reads the whole of `data/stock.json`, changes one count, and writes the whole file back. A write takes a moment, and if the program stops in that moment, the file holds the first half of the new text and nothing else. Run `node src/try.js`: its first lines show what that half looks like, and what reading it back says.

Over five issues you build Ashgrove a store that never writes over what it had. It starts here, in memory.

## Keys and values

Think of a cloakroom. You hand over a coat and get a ticket with a number; later the number gets you that coat back, and nothing else. The number is the key, the coat the value. A key-value store is exactly that: `set(key, value)` hands something in, `get(key)` gets it back, and setting the same key again swaps the old value for the new one.

Your store keeps keys and values as text. A count of 1200 cards goes in as `'1200'` and comes back as `'1200'`, letter for letter. That keeps the store simple and honest: it never guesses what a value means. Whoever uses it turns text into numbers and back.

`open(dir)` makes a store. It takes a folder because from the next issue on the store keeps a file there, and it returns a promise because opening will then read that file. In this issue nothing touches the disk yet.

## Missing is not empty

A cloakroom that loses track of the difference between "no coat with this number" and "an empty hanger" will one day give someone the wrong answer. Your store has the same two cases:

```js
await lamps.set('desk', '')
lamps.get('desk')    // ''          the key is there, its value is empty
lamps.get('porch')   // undefined   there is no such key
```

An empty text is falsy, so code that asks `if (value)` cannot tell these apart. `has(key)` asks the right question: is this key kept at all? And `delete(key)` removes the key itself. Setting its value to `''` or `undefined` is not a delete, because the key would still be there.

## Any text is a key

A plain object looks like a natural place to keep values, until you ask it about a key nobody set:

```js
const shelf = {}
shelf['toString']       // a function, though nobody put it there
'constructor' in shelf  // true
```

Every plain object starts with names from `Object.prototype`, and `__proto__` is not an ordinary property at all: a text set under it simply disappears. A store must treat every text alike, the empty text included. A `Map` starts truly empty and does exactly that. An object made with `Object.create(null)` has no prototype and works too, if you ask whether a key is its own.

The other side of "keys and values are text" is refusing what is not. If `set('card', 1200)` quietly kept the number, the next issue would have to write a number to a file and read back text, and the two would no longer match. So `set` throws a `TypeError` for a key or a value that is not text, and keeps nothing; `get`, `has` and `delete` throw one for a key that is not text. `typeof value === 'string'` tells you which you have.

## Your work in this issue

All three tasks are in `src/db.js`: first `open`, `get` and `set`, then `has` and `delete`, then the rules about text. Try your work with:

```sh
node src/try.js
```

It puts Idris's counts into your store, changes a few, and reads them back. Its last line opens the same folder again and finds nothing: this store keeps its values in memory, so they are gone the moment a new store starts or the program stops. That is what the next issue fixes. The check never uses the shop's counts. It opens stores of its own, a fresh one for every case.
