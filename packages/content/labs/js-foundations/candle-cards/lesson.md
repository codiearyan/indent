# A card for every candle

## What you will be able to do

Until now every value you used was one thing: a number, a text, true or false, or a list of them. A candle is more than one thing. It has a name, a weight, a price and a stock, and they belong together. JavaScript keeps things like that in an object: one value with named parts. By the end of this issue you will be able to:

- make an object with named properties
- read a property with a dot, and with brackets when its name is in a variable
- ask whether an object has a property
- change, add and remove properties

## The request from Theo

Theo keeps a box of paper cards behind the counter, one card per candle.

> **Theo:** Every card says the candle's name, its size in grams, its price and how many we have. When someone emails to ask about the fig candle, I go and find the card. When we sell out, I write "sold out" across it in pencil and rub it out when Ines pours more. The shop's site needs these cards too, and paper won't do. Can the laptop keep them?

All four tasks are in `src/objects.js`.

## An object is a thing with named parts

An object is written in curly braces. Inside, each property is a name, a colon and a value, with commas between them:

```js
const book = { title: 'Salt Roads', pages: 312, onLoan: false }
```

The names are called keys, and the values can be anything: numbers, text, true or false, lists, even other objects. Node prints an object the same way you write it:

```js
console.log(book) // { title: 'Salt Roads', pages: 312, onLoan: false }
```

A function can build an object from its parameters and hand it back:

```js
function makeBook(title, pages) {
  return { title: title, pages: pages, onLoan: false }
}
```

When a property has the same name as the variable that holds its value, you may write the name once: `{ title, pages, onLoan: false }` means the same.

## Reading a property

A dot and the key read one property:

```js
book.title // 'Salt Roads'
book.pages // 312
```

Brackets do the same with the key as text: `book['pages']` is `312`. Brackets matter when the key is not written in your code but kept in a variable:

```js
const wanted = 'pages'
book[wanted] // 312, the property whose name is in wanted
book.wanted // undefined: this looks for a property called wanted
```

Brackets with no quotes use what is inside the variable. A dot, or brackets with quotes, use the word itself. Keys are compared letter by letter, so `book.Title` is `undefined` too.

Reading a property that is not there is not an error. It gives `undefined`, like a `let` made without a value. The error comes one step later, when you read a property of that `undefined`:

```js
book.author // undefined
book.author.name // TypeError: Cannot read properties of undefined (reading 'name')
```

The message names the property it tried to read, `name`. The thing before that dot is what is missing.

## Is it there?

Because a missing property reads as `undefined`, you might ask `book.author === undefined`. That is not quite the same question, since a property can be there and hold `undefined`, `0` or empty text. To ask whether an object has a property at all, use `in`, with the key as text on its left:

```js
'pages' in book // true
'author' in book // false
```

The answer is `true` or `false`, whatever the property holds. On the left you can also put a variable that holds a key, without quotes.

## Changing, adding and removing

A property takes a new value with a single `=`, the same as a `let`:

```js
book.onLoan = true
book.pages = book.pages + 4
```

Giving a value to a key the object does not have adds it:

```js
book.dueBack = 'Friday'
```

And `delete` removes a property, key and value together:

```js
delete book.dueBack
'dueBack' in book // false
```

Giving a property the value `undefined` is not the same: the key stays, holding nothing. Only `delete` makes it go.

These lines change the object itself. Even when it is made with `const`, its properties can change; `const` only means the name `book` always points at this one object. A function that is given an object and changes it changes the object the caller has, too.

## Your work in this issue

Open `src/objects.js`. Task 1 makes a card. Task 2 has you write a small function of your own, `hasLine`, and use it to read any line of a card. Tasks 3 and 4 change a card when candles are sold and poured. Run `node src/objects.js` after each task. Check calls your functions with cards of its own. Keep the function names and the last line of the file as they are.
