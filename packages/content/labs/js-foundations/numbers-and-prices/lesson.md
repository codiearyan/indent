# Numbers and prices

## What you will be able to do

The shelf count works. Just before lunch the first order of the day arrives, and someone has to work out what it costs. Theo usually does it on his phone's calculator and sometimes gets it wrong by a cent, which customers notice. In this issue you make the laptop do the sums. By the end of it you will be able to:

- add, subtract, multiply and divide in JavaScript
- control the order a sum is worked out in
- keep money in whole cents, and say why
- round numbers up, down or to the nearest with `Math`

## The request from Theo

> **Theo:** Three candles, a newsletter discount, shipping, and Ines asks how many boxes to fold. I do it four times a day on my phone and last week I charged someone a cent too much. Can the laptop work it out the same way every time?

All four tasks are in `src/prices.js`.

## Doing sums

JavaScript does arithmetic with these operators:

| Operator | Means    | Example  | Result |
| -------- | -------- | -------- | ------ |
| `+`      | plus     | `7 + 3`  | `10`   |
| `-`      | minus    | `7 - 3`  | `4`    |
| `*`      | times    | `7 * 3`  | `21`   |
| `/`      | divided  | `7 / 2`  | `3.5`  |

A sum can use variables as well as numbers, and the result can go straight into a new variable:

```js
const sconeCents = 320
const scones = 4
const sconesCents = sconeCents * scones
console.log(sconesCents) // 1280
```

Writing names instead of numbers is what makes code useful: when tomorrow's order has a different price or quantity, the same line still gives the right answer.

## Which part goes first

When a sum mixes operators, `*` and `/` are worked out before `+` and `-`, as in school maths. So `2 + 3 * 4` is `14`, not `20`. Round brackets change the order: `(2 + 3) * 4` is `20`. When you are not sure, add brackets. They cost nothing and make the order plain to the next reader too.

A percentage is a number of hundredths. Twenty percent of 1280 is `1280 * 20 / 100`, which is `256`.

## Why the shop counts in cents

Computers store numbers with decimals in a way that is almost, but not quite, exact. Try this in a file:

```js
console.log(0.1 + 0.2)
```

It prints `0.30000000000000004`. A tiny error like that is harmless in a drawing, but with money it becomes a cent that goes missing or appears from nowhere. Whole numbers do not have this problem. So the shop keeps every amount in cents: 12.50 is stored as `1250`. You only turn cents into a price with a decimal point at the very end, when a person needs to read it.

## Rounding with Math

Some sums still give a part of a cent, for example a percentage of an odd amount. JavaScript has a built-in toolbox called `Math` with three ways to turn such a number into a whole one:

```js
Math.round(2.5) // 3, to the nearest whole number; a half goes up
Math.round(2.4) // 2
Math.floor(2.9) // 2, always down
Math.ceil(2.1)  // 3, always up
```

You use them by writing the name, then the number or sum in round brackets. The sum inside the brackets is worked out first, then rounded:

```js
const tipCents = Math.round(sconesCents * 15 / 100)
```

Which one is right depends on the question. A price is usually rounded to the nearest cent. Counting something that cannot be split, like a table for a group of guests, often needs `Math.ceil`: seven guests at tables of four need two tables, even though the second is not full. `Math` also has `Math.max(a, b)` and `Math.min(a, b)`, which give the larger or the smaller of two numbers; you will meet them again later.

## Your work in this issue

Open `src/prices.js`. Near the top is today's first order: the price of one candle, how many were bought, the discount, shipping and how many candles fit in a box. Check runs your file with other orders in their place, so always build on those names. Do the four tasks in order under their `// Task` comments. Tasks 2 and 3 use the variables you made before them, so make sure each one passes before going on. Run `node src/prices.js` after every change and check the numbers by hand once.
