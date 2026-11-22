# Text and labels

## What you will be able to do

After lunch Ines prints the shipping labels. The names come from the checkout exactly as customers typed them, stray spaces and small letters included, and the labels look careless. In this issue you make the laptop tidy the text and write the label. By the end of it you will be able to:

- join text and values into one string
- drop values into text with a template literal
- tidy, cut and change strings with their methods
- find out how long a string is

## The request from Ines

> **Ines:** Look at this label. Two spaces before the name, the city spelt in small letters. The courier wants a three-letter city code in capitals, and the printer only fits so many characters on a line. Can you write the label for me?

All four tasks are in `src/labels.js`.

## Strings

Text in JavaScript is called a string. You already know it sits between quotes: `'Hello'`. Spaces inside the quotes are part of the string, so `' Hello'` and `'Hello'` are different strings, which is exactly the problem with the checkout.

Strings can be joined with `+`:

```js
const cake = 'lemon'
const boxLabel = 'One ' + cake + ' cake'
console.log(boxLabel) // One lemon cake
```

The spaces have to be written inside the quotes, or the words run together.

## Template literals

Joining with `+` gets hard to read once there are several pieces. A template literal is a string written between backticks, the key usually above Tab, and it lets you drop a value straight into the text with `${...}`:

```js
const slices = 8
const boxLabel = `One ${cake} cake, ${slices} slices`
console.log(boxLabel) // One lemon cake, 8 slices
```

Whatever is inside `${}` is worked out and put into the text. A number becomes its digits. You can even do a small sum there: `${slices * 2}`.

## Methods do jobs on strings

Every string comes with built-in tools called methods. You use one by writing the string or its variable, a dot, the method's name and round brackets:

```js
const typed = '  Rosa Bell '
typed.trim()        // 'Rosa Bell', spaces at both ends removed
typed.toUpperCase() // '  ROSA BELL ', all capitals
typed.toLowerCase() // '  rosa bell ', all small letters
```

A method never changes the original string. It gives you a new one, so store the result in a variable when you want to keep it:

```js
const tidy = typed.trim()
```

`slice` cuts out part of a string. You give it where to start and where to stop, counting positions from 0, and the stop position itself is not included:

```js
const flavour = 'raspberry'
flavour.slice(0, 4) // 'rasp', positions 0, 1, 2 and 3
flavour.slice(4)    // 'berry', from position 4 to the end
```

Because each method gives back a string, you can call another method right after it. This is called chaining, and it runs from left to right:

```js
flavour.slice(0, 4).toUpperCase() // 'RASP'
```

A method only runs with its round brackets. Without them, as in `flavour.toUpperCase`, you get the method itself, and `console.log` prints `[Function: toUpperCase]` instead of a string.

## How long is it?

`length` tells you how many characters a string has, spaces and punctuation included. It is not a method, so it has no brackets:

```js
const order = 'Two scones, please'
console.log(order.length) // 18
```

Adding brackets anyway, as in `order.length()`, stops Node with `TypeError: order.length is not a function`.

Strings have many more methods. `includes`, for example, says whether one string appears inside another; its answer is true or false, which the next issue is all about.

## Your work in this issue

Open `src/labels.js`. Near the top is today's parcel as the customer typed it: their name, their city and the order number. Check runs your file with other parcels in their place, so build on those names. Do the four tasks in order under their `// Task` comments: each one uses the variable from the task before. Run `node src/labels.js` after every change and read the label it prints.
