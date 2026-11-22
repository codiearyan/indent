# Saving the catalogue

## What you will be able to do

Everything your code has built in this part lives only while the program runs. When Node stops, the cards, the counts and the price lists are gone. To keep data, programs write it to a file or send it over the network, and both of those carry only text. This issue is about the trip from data to text and back, what survives it, and what to do when the text that comes back is broken. By the end of it you will be able to:

- turn objects and lists into JSON text, readable or compact
- read JSON text back into objects and lists
- know what JSON loses on the way, and save a Map anyway
- catch an error so broken text does not stop your program

## The request from Theo

> **Theo:** The site wants the catalogue as a file, and I want to be able to open that file and read it. Last week the laptop died halfway through saving, and the next morning the whole shop page was an error message. Whatever is in that file, the site has to come up. Oh, and Ines changed the settings once and now nobody remembers what the others were.

All four tasks are in `src/saving.js`.

## Data to text

JSON is a way of writing data as text. It looks almost like JavaScript, with double quotes around every key and every text:

```json
{ "title": "Salt Roads", "pages": 312, "tags": ["sea", "travel"] }
```

`JSON.stringify` turns a value into that text:

```js
const book = { title: 'Salt Roads', pages: 312 }
JSON.stringify(book) // '{"title":"Salt Roads","pages":312}'
```

The result is all on one line, which is good for a computer and hard for a person. A third value gives an indent, so every property gets a line of its own. The second value is for something this issue does not need; put `null` there:

```js
JSON.stringify(book, null, 2)
```

Turning an object into text the ordinary way, with `String(book)` or inside a template literal, gives `[object Object]`, which keeps nothing.

## Text to data

`JSON.parse` does the opposite trip:

```js
const back = JSON.parse('{"title":"Salt Roads","pages":312}')
back.pages // 312
```

`back` is a new object with the same properties. JSON text can hold objects, lists, text, numbers, `true`, `false` and `null`, and any mix of them. `'0'`, `'null'` and `'[]'` are all JSON: they read back as `0`, `null` and an empty list.

## What does not survive the trip

JSON knows only those kinds of values. Everything else changes or disappears on the way:

```js
JSON.stringify({ due: undefined, shelf: 'B' }) // '{"shelf":"B"}'
JSON.stringify(new Map([['B', 4]])) // '{}'
JSON.stringify(new Set(['sea'])) // '{}'
```

A property holding `undefined` or a function is left out. A Map or a Set becomes `{}`, because its contents are not properties. A date becomes text and comes back as text, not a date. `NaN` becomes `null`.

To save a Map, turn it into something JSON keeps first. Spread from the last issue turns a Map into a list of pairs, and `new Map()` turns such a list back into a Map:

```js
const pairs = [...new Map([['B', 4]])] // [['B', 4]]
new Map(pairs) // Map(1) { 'B' => 4 }
```

## When the text is broken

`JSON.parse` on text that is not JSON throws an error, and an error stops the whole program:

```js
JSON.parse('{"title":"Salt') // SyntaxError: Unterminated string in JSON at position 14
```

A file cut off halfway, an empty file, a stray letter: all of them stop the program, unless you catch the error. Code inside `try { }` runs as usual, but when anything in it throws, Node jumps to the `catch { }` part instead of stopping:

```js
function readShelf(text) {
  try {
    return JSON.parse(text)
  } catch (error) {
    console.log('Could not read the shelf:', error.message)
    return 'unknown'
  }
}
```

`error` holds what was thrown; leave out `(error)` when you do not need it. Catch only around the line that can fail, and give back something your program can go on with, such as an empty list or a default.

Defaults often go together with loading. Saved data may hold only some of what you need, because it was saved by an older version or by hand. Spread fills the gaps: `{ ...defaults, ...saved }` starts from the defaults, and every saved key written after them wins. It makes a new object, so the defaults stay as they are for the next time.

## Your work in this issue

Open `src/saving.js`. Task 1 saves the catalogue as readable text. Task 2 loads it back and survives a broken file. Task 3 saves a Map and brings it back as a Map. Task 4 has you write a function of your own that reads JSON safely, and use it to load the settings over their defaults. Run `node src/saving.js` after each task. Check uses texts of its own, broken ones included. Keep the function names and the last line of the file as they are.
