# Doing it again

## What you will be able to do

The rules have names now, and Ines calls them for every order. Today's jobs are different: they are the same small step done again and again. Number every candle in a batch. Count week after week until a goal is reached. Look at every letter of an engraving. Writing the step once and letting the laptop repeat it is called a loop. By the end of this issue you will be able to:

- repeat code a set number of times with `for` and a counter
- repeat code until something changes with `while`
- go through every character of a text with `for...of`
- stop a loop early, and stop a file that never ends

## The request from Ines

> **Ines:** I poured a batch this morning and wrote "Fig 1, Fig 2, Fig 3" all the way to twelve by hand. Theo keeps asking how many weeks until we reach a hundred orders a week. And the engraving machine charges per letter, but not for spaces, so I count letters on my fingers. The laptop should do the counting.

All four tasks are in `src/loops.js`.

## for: a counter that steps along

A `for` loop has three parts in its round brackets, separated by semicolons: where the counter starts, the condition to keep going, and how the counter changes after each round.

```js
for (let table = 1; table <= 4; table++) {
  console.log(`Table ${table} is laid`)
}
```

This prints four lines, for tables 1, 2, 3 and 4. `table++` adds one to `table`; it is short for `table = table + 1`. Before every round Node checks the condition, and once it is false the loop is over.

Most loop mistakes are about the edges. Start at 0 instead of 1, or write `<` where you meant `<=`, and the loop runs once too few or once too often. When the numbers look off by one, read the three parts again.

A loop often builds something up: start a `let` before the loop, add to it each round, and use it after the loop.

```js
let cups = ''
for (let cup = 1; cup <= 3; cup++) {
  cups = cups + 'cup '
}
// cups is 'cup cup cup '
```

## while: repeat until something changes

Sometimes you do not know how many rounds you need, only when to stop. A `while` loop checks its condition before every round and keeps going as long as it is true:

```js
let kettleDegrees = 20
let minutes = 0
while (kettleDegrees < 100) {
  kettleDegrees = kettleDegrees + 15
  minutes++
}
```

If the condition is false from the start, the loop never runs at all.

Something inside the loop has to move the condition towards false. Forget `kettleDegrees = kettleDegrees + 15` and the condition stays true forever. Then the file never finishes and the terminal just sits there. Press Ctrl+C to stop it, and look at what changes inside the loop.

## Stopping early

`break` ends a loop at once, and `return` inside a loop in a function ends both the loop and the function. That is how you stop looking once you have found what you need:

```js
function firstFreeTable(tablesTaken) {
  for (let table = 1; table <= 10; table++) {
    if (table > tablesTaken) {
      return table
    }
  }
  return -1
}
```

The `return -1` comes after the loop, because "not found" is only true once every round has run.

## for...of: every character of a text

`for...of` hands you the characters of a text one by one, from the first to the last:

```js
let stars = 0
for (const character of 'Tea *** room') {
  if (character === '*') {
    stars++
  }
}
// stars is 3
```

You do not manage a counter, so you cannot get the edges wrong. When you need to know where a character is, use a counting loop instead. Positions count from 0, as with `slice`, and `text[position]` reads the character at a position. The last position is one less than `text.length`.

```js
const word = 'scone'
word[0] // 's'
word[4] // 'e'
```

To ask whether a character is one of several, `includes` helps: `'aeiou'.includes(character)` is true for a vowel.

## Your work in this issue

Open `src/loops.js`. Each task fills in one function, and a `console.log` line under it shows what it gives. Check calls your functions with its own values, and looks for the kind of loop each task asks for. Run `node src/loops.js` after every change. If it does not finish, press Ctrl+C. Keep the function names and the last line of the file as they are.
