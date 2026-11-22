# Making decisions

## What you will be able to do

Your first day is behind you. The laptop prints, counts, prices and answers yes or no. This morning Theo has a new wish: a yes or a no is good, but he wants the laptop to act on it, to pick a shipping price, a word or a day the way he would. Code that takes one road or another depending on a question is called a decision. By the end of this issue you will be able to:

- run code only when a condition is true, with `if`
- give the other case its own code, with `else`
- ask several questions in order, with `else if`
- pick one of two values in a single line, with `? :`

## The request from Theo

> **Theo:** Every order, I look up the same things. Is the cedar running low? What does shipping cost for this zone? Do I write "candle" or "candles" on the slip? Will it go out today or tomorrow? I have the rules in my notebook. Can the laptop follow them instead of me?

All four tasks are in `src/decisions.js`.

## if runs code when a condition is true

An `if` asks a question in round brackets. When the answer is `true`, the code in its curly braces runs. When it is `false`, Node skips the braces:

```js
const guests = 7

if (guests > 6) {
  console.log('Join two tables')
}
```

The question is any comparison you know from your first day: `>`, `<`, `>=`, `<=`, `===`, `!==`, joined with `&&` or `||` when you need to. Any value works, in fact, because truthy and falsy values count as true and false.

Add `else` to give the other case its own code:

```js
if (guests > 6) {
  console.log('Join two tables')
} else {
  console.log('One table is fine')
}
```

Exactly one of the two parts runs, never both, never neither.

## Choosing a value with if

Often you want a decision to leave a value behind. Make the variable first with `let` and no value, then give it one in each part:

```js
let tableSize
if (guests > 6) {
  tableSize = 'long table'
} else {
  tableSize = 'round table'
}
console.log(tableSize)
```

Make the variable above the `if`, not inside the braces. A name made with `let` or `const` inside `{ }` exists only until the closing brace, so a `console.log` after it would stop with `ReferenceError: tableSize is not defined`. A later issue in this part looks at that closely.

One more trap: inside the round brackets, compare with `===`. A single `=` gives a value instead of asking a question. With a `const`, Node stops with `TypeError: Assignment to constant variable`, and with a `let` the question quietly changes its answer.

## else if asks the next question

When there are more than two cases, chain them with `else if`:

```js
let pot
if (guests === 1) {
  pot = 'small pot'
} else if (guests <= 4) {
  pot = 'medium pot'
} else {
  pot = 'large pot'
}
```

Node asks the questions from top to bottom and runs only the first part whose answer is true. The rest are skipped, even if they would be true too. That is why the order matters. Here `guests <= 4` is also true for one guest, but one guest never gets that far. When one rule beats all the others, ask about it first. The `else` at the end catches everything no question matched.

## The short form: ? and :

For a choice between two values there is a shorter way, the conditional operator:

```js
const cupWord = guests === 1 ? 'cup' : 'cups'
```

Read it as: is `guests` the same as 1? If yes, `'cup'`; if no, `'cups'`. The question comes first, then `?`, the value for yes, `:` and the value for no. It fits on one line, and because it gives back a value, you can use it with `const`.

Use the short form when you pick between two values. When each case needs several lines, or there are three or more cases, `if` and `else` are easier to read.

## Your work in this issue

Open `src/decisions.js`. Near the top is today's order and the shop's numbers: the total, the delivery zone, the stock, the quantity and the hour on the shop clock. Check runs your file with other orders in their place, so build on those names. Do the four tasks under their `// Task` comments. Run `node src/decisions.js` after each one, then change a value at the top and run it again to see the decision go the other way.
