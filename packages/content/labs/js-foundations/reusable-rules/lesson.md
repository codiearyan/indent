# Rules you can reuse

## What you will be able to do

The laptop now follows Theo's rules for today's order. But only for today's order: to price tomorrow's, Ines has to change the values at the top of the file, or copy the lines and change the names. A function is the way out. It is a rule with a name that you write once and use for any order you hand it. By the end of this issue you will be able to:

- write a function and call it
- hand it values through parameters
- give back an answer with `return`
- give a parameter a default value, and call one function from another

## The request from Ines

> **Ines:** Six orders came in at once this morning. I copied the shipping lines six times and changed the numbers in each copy, and I still got one wrong. Then I fixed a mistake in the label lines and had to fix it in six places. Can't we write each rule once?

All four tasks are in `src/functions.js`.

## A function is a rule with a name

You write a function once, with the word `function`, a name, round brackets and curly braces around its code:

```js
function greetGuest(name) {
  return `Welcome to the tea room, ${name}`
}
```

Writing it runs nothing yet. The code inside runs when you call the function: its name followed by round brackets with the values it needs.

```js
console.log(greetGuest('Mira'))  // Welcome to the tea room, Mira
console.log(greetGuest('Oskar')) // Welcome to the tea room, Oskar
```

That is why a function beats copied lines. The rule lives in one place, so a fix happens once, and every call gets it. And the name says what the lines do, so the code reads like the rule.

## Parameters and return

The names in the round brackets of the function, like `name` above, are its parameters. When you call `greetGuest('Mira')`, the value `'Mira'` arrives as `name` inside the function. Values go in by position: the first value to the first parameter, the second to the second.

```js
function teaFor(guests, cupsEach) {
  return guests * cupsEach
}

teaFor(4, 2) // 8
```

`return` hands a value back to the place where the function was called, and ends the function at once. Lines after a `return` that ran are skipped, which is handy in an `if`:

```js
function tableFor(guests) {
  if (guests > 6) {
    return 'long table'
  }
  return 'round table'
}
```

`console.log` is not the same as `return`. It shows text in the terminal, but the caller gets nothing. A function that has no `return` gives back `undefined`, so `console.log(teaFor(4, 2))` would print `undefined` if `teaFor` only printed its answer.

## Default values

When you call a function with fewer values than it has parameters, the missing ones are `undefined`. Maths with `undefined` gives `NaN`. A default value, written after `=` in the brackets, steps in instead:

```js
function sconesFor(guests, eachGuest = 2) {
  return guests * eachGuest
}

sconesFor(3)    // 6, eachGuest is 2
sconesFor(3, 1) // 3
sconesFor(3, 0) // 0
```

A default is used only when the value is missing, that is `undefined`. A `0` that is handed in stays `0`. That is different from `eachGuest || 2`, which would turn the 0 into a 2, because 0 is falsy.

## Functions that call functions

The answer of a call is a value like any other, so you can keep it in a `const`, put it in a template literal, or hand it to another function:

```js
function billFor(guests) {
  const tea = teaFor(guests, 2)
  return tea * 350
}
```

Small functions that each do one job, and a bigger one that calls them, is how most programs are built.

A few things that go wrong on the way. Every `{` needs its `}`; a missing one makes Node stop with a `SyntaxError` near the end of the file. If your `console.log` line slips inside the braces of a function, it only runs when the function is called, so nothing prints. And a call with a name spelt differently from the function, a capital letter included, stops with `ReferenceError: ... is not defined`.

## Your work in this issue

Open `src/functions.js`. Most tasks fill in a function that is already there, empty, with no parameters yet. In Task 2 you also write a whole function of your own, from the word `function` to its closing brace. Below each function a `console.log` line calls it, so `node src/functions.js` shows your answers as you go. Check calls your functions with its own values. The last line of the file starts with `export`: it lets Check and the flow reach your functions. Modules and `export` come later in the course, so leave that line as it is, and keep each function's name exactly as given. Do the tasks in order; Task 4 uses Tasks 2 and 3.
