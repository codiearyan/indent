# No error, wrong answer

## What you will be able to do

The restock sheet is with the supplier. At closing time Theo runs the till file, which adds up the day, and for once there is no red text at all. The answers are still wrong. An order total of more than three million cents, a count of `NaN` candles, a label whose length is `undefined`. These are the hardest mistakes to find, because Node does not point at them. You have to look yourself. By the end of this issue you will be able to:

- tell that no error does not mean right
- print a value, with a label, to look inside your program
- print a value's type with `typeof`
- trace `NaN`, `undefined` and text posing as a number back to the line that made them

## The request from Theo

> **Theo:** No red this time, I checked. But nobody spent three million cents on candles today, and I am fairly sure we packed more than NaN. Can you find out where the numbers go wrong?

All three tasks are in `src/till.js`.

## Quiet mistakes

An error tells you that Node could not do something. A program that runs to the end only tells you that Node could do everything you asked. If you asked for the wrong thing, you get the wrong answer, quietly, every time.

So when a file runs, compare its output with what you expected, using a case you can work out in your head. If the comment says the total should come out like 4245 and it prints something else, there is a mistake, error or not.

## Print to look inside

The quickest way to find a quiet mistake is to make the program show you what it holds. Add a `console.log` for the values you are unsure of, with a label, so you can tell the lines apart:

```js
const cakesCents = 900
const deliveryText = '250'
const billCents = cakesCents + deliveryText
console.log('billCents:', billCents)
```

```
billCents: 900250
```

That is clearly not 900 plus 250. Now go one step back and print what went into the sum. Work backwards from the wrong value until you find the line where a right value turns into a wrong one. That line is the mistake.

Prints like these are for you, not for the shop. Remove them once you have found the problem.

## Print the type too

A value can look right and be the wrong kind. `typeof` gives the kind of a value as text:

```js
console.log('billCents:', billCents, typeof billCents)
console.log('cakesCents:', cakesCents, typeof cakesCents)
console.log('deliveryText:', deliveryText, typeof deliveryText)
```

```
billCents: 900250 string
cakesCents: 900 number
deliveryText: 250 string
```

When printed, the number `250` and the text `'250'` look the same; `typeof` shows the difference. Here it is the cause: `+` with text on either side joins the two like words, which is why the bill is a long string of digits. The kinds you know so far are `'number'`, `'string'`, `'boolean'` and `'undefined'`. `typeof null` gives `'object'`, a known oddity, and `typeof NaN` gives `'number'`.

## The three quiet wrong values

**Text where a number was meant.** It comes from anything typed or read from outside the program: a form, a price list, a file. It joins instead of adding. Turn it into a number with `Number` before you do sums with it.

**`NaN`.** It comes out of maths that could not be done, and once it is in a sum, everything after it is `NaN` too:

```js
const slicesText = 'two'
const slices = Number(slicesText)
const cakesCents = slices * 450
console.log('cakesCents:', cakesCents, typeof cakesCents)
```

```
cakesCents: NaN number
```

Print each part of the sum to find the one that is not a real number. Text that is not a number gives `NaN`, and so does `undefined` in a sum.

**`undefined`.** It means a value was never given. A `let` made without a value holds it:

```js
let tableNumber
console.log('tableNumber:', tableNumber)
```

```
tableNumber: undefined
```

You also get it when you ask a value for something it does not have. Text has a `length`, but `'Lemon tart'.Length`, with a capital L, is `undefined`, with no error at all. Spelling counts after a dot just as it does in names.

Each of these keeps going through your program without a complaint, and shows up somewhere later as a strange answer. That is why you work backwards: the place where you notice it is rarely the place where it began.

## Your work in this issue

Open `src/till.js` and run `node src/till.js`. Each task has one line that makes a wrong value, and the comment above it says what the right answer looks like. Add prints with labels and types until you find that line, fix it, and remove your prints if you like. Put each print under the task it is about: Check runs the lines of each task on their own. Keep the lines that hold the shop's own values as they are: Check runs each task with values of its own.
