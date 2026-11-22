# True or false

## What you will be able to do

The labels look tidy. In the middle of the afternoon Theo opens his notebook of shop rules: when shipping is free, when an order can go out today, when a gift note needs a card. He checks every order against them by eye. Each rule has a yes or no answer, and JavaScript has a kind of value for exactly that. By the end of this issue you will be able to:

- compare numbers and text, and get `true` or `false`
- join rules with "and", "or" and "not"
- say why `===` is the safe way to compare
- tell which values count as true and which as false

## The request from Theo

> **Theo:** Free shipping from fifty up, or anywhere local. Ship today only if we have the candles and we are open. And a little card when there is a gift note. I check all of that by eye and I miss things. Can the laptop answer yes or no for me?

All four tasks are in `src/booleans.js`.

## true and false

JavaScript has two values for yes and no: `true` and `false`, written without quotes. They are called booleans. You can store them like any other value:

```js
const teaRoomOpen = true
```

Most of the time, though, a boolean comes out of a question.

## Comparisons ask questions

A comparison looks at two values and gives `true` or `false`:

| Operator | Asks                          | Example     | Result  |
| -------- | ----------------------------- | ----------- | ------- |
| `>`      | bigger than?                  | `8 > 6`     | `true`  |
| `<`      | smaller than?                 | `8 < 6`     | `false` |
| `>=`     | bigger than or equal to?      | `6 >= 6`    | `true`  |
| `<=`     | smaller than or equal to?     | `7 <= 6`    | `false` |
| `===`    | the same?                     | `'oat' === 'oat'` | `true` |
| `!==`    | not the same?                 | `'oat' !== 'soy'` | `true` |

The answer can go straight into a variable:

```js
const guests = 6
const seats = 4
const tooMany = guests > seats // true
```

Notice the difference between `>` and `>=`: six is not bigger than six, but it is bigger than or equal to six. When a rule says "or more" or "at least", it includes the equal case.

## Why three equals signs

A single `=` stores a value, as you know. To compare, use `===`. JavaScript also has `==`, with two signs, but it quietly converts values before comparing, so `'4' == 4` is `true` even though one is text and one is a number. `===` does not convert: `'4' === 4` is `false`. Always use `===` and `!==`; they say exactly what they mean.

Text comparisons are exact, too: `'Oat' === 'oat'` is `false`, because capitals count.

## And, or, not

Rules often have parts. Three operators join booleans:

- `a && b` is "and": true only when both are true.
- `a || b` is "or": true when at least one is true.
- `!a` is "not": it turns true into false and false into true.

```js
const hasTable = seats >= guests
const kitchenOpen = true
const canSeat = hasTable && kitchenOpen
const goesToWaitlist = !canSeat
```

You can mix them, and round brackets make the order clear: `(a || b) && c`.

## Truthy and falsy

Every value in JavaScript counts as either true or false when it is used where a yes or no is expected. Only a handful count as false, and they are called falsy:

- `false`
- `0`
- `''`, empty text
- `null`, `undefined` and `NaN`, which the next issue explains

Everything else is truthy: any number but 0, any text with at least one character in it, even `'0'` or `' '`.

To turn a value into the plain `true` or `false` it counts as, use `Boolean`:

```js
Boolean('Table by the window') // true
Boolean('')                    // false
Boolean(0)                     // false
```

This is handy when a rule depends on whether something is there at all, like a request written on a booking.

## Your work in this issue

Open `src/booleans.js`. Near the top is today's order and the shop's rules: the total, the free shipping line, the delivery zone, the stock, whether the shop is closed, and the gift note. Check runs your file with other orders in their place, so build on those names. Do the four tasks in order under their `// Task` comments; Task 2 uses Task 1. Run `node src/booleans.js` after each change, then change a value at the top and run it again to watch the answers flip.
