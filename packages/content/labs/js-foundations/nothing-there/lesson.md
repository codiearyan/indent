# Nothing there

## What you will be able to do

It is late in the afternoon, and the last orders of the day come in through the shop's order form. Theo has noticed something odd: an order for 3 candles plus one extra came out as 31. The form sends everything as text, and boxes the customer left empty come through as nothing at all. In this issue you learn how JavaScript says "nothing is here" and how to read a form safely. By the end of it you will be able to:

- tell `undefined`, `null` and `NaN` apart
- turn text into a number, and spot when that fails
- give a missing value a default with `??`
- choose between `??` and `||`

## The request from Theo

> **Theo:** Somebody asked for 3 candles and the laptop said 31. Somebody else typed "two" in the extras box. Half the gift notes are empty. I need the form read properly, with sensible answers when something is missing or makes no sense.

All four tasks are in `src/missing.js`.

## Three kinds of nothing

**`undefined`** means a value was never given. A `let` made without a value holds `undefined`, and so does anything you ask for that is not there:

```js
let tableNumber
console.log(tableNumber) // undefined
```

**`null`** means "empty, on purpose". A program puts `null` somewhere to say "we know about this, and there is nothing in it", like a booking with no special requests:

```js
const requests = null
```

**`NaN`** means "not a number". It is what you get when maths goes wrong, for example when text that is not a number is turned into one. Strangely, its type is still number.

`typeof` tells you what kind of value you have: `typeof 'tea'` is `'string'`, `typeof 4` is `'number'`, `typeof undefined` is `'undefined'`.

## Text that looks like a number

Forms send text. `'4'` looks like a number but it is a string, and `+` with a string joins instead of adding:

```js
const guestsText = '4'
console.log(guestsText + 1) // '41'
```

To work with it as a number, turn it into one with `Number`:

```js
const guests = Number(guestsText)
console.log(guests + 1) // 5
```

`Number` is strict: it ignores spaces around the digits, but anything else makes the whole thing `NaN`.

```js
Number(' 4 ')     // 4
Number('four')    // NaN
Number('4 seats') // NaN
Number('')        // 0, careful: empty text becomes 0
Number(null)      // 0
```

There is also `parseInt`, which is not strict: it reads digits from the start and stops at the first thing that is not one, so `parseInt('4 seats')` is `4`. Sometimes that is what you want, but for a form it hides mistakes. In this issue, use `Number`.

## Spotting NaN

`NaN` is the one value that is not equal to itself, so `x === NaN` is always `false`, even when `x` is `NaN`. Ask with `Number.isNaN` instead:

```js
Number.isNaN(Number('four')) // true
Number.isNaN(Number('4'))    // false
```

Add `!` in front when you want the opposite question: "is this a real number?"

## Defaults with ?? and ||

Often the right answer to "nothing is here" is a sensible default. `??` gives the value on its right only when the one on its left is `null` or `undefined`:

```js
const requestsShown = requests ?? 'None'
```

`||` from the last issue does something similar, but it steps in for every falsy value: `null` and `undefined`, and also `0`, `''` and `NaN`.

```js
''  ?? 'None' // ''      empty text is kept
''  || 'None' // 'None'  empty text is replaced
0   ?? 2      // 0
0   || 2      // 2
NaN || 2      // 2
```

Pick by asking which values should count as missing. If empty text or 0 are real answers, use `??`. If they should be replaced too, use `||`.

## Your work in this issue

Open `src/missing.js`. Near the top is today's order form as the site sends it: the quantity as text, a gift note that may be `null`, and the extras box. Run `node src/missing.js` first and read the second line: that is Theo's 31. Check runs your file with other forms in their place, so build on those names. Do the four tasks in order under their `// Task` comments; Task 4 uses Task 1.
