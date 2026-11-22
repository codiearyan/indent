# Passing functions along

## What you will be able to do

Your functions take numbers and text, and hand back numbers and text. Ines is planning a weekend sale, and Theo wants to try other price rules too: a discount on Saturday, wrapping added, maybe a round number for the market. Writing a new pricing function for every rule would mean copying again. There is a better way, because in JavaScript a function is a value like any other. You can keep it in a variable, hand it back, and pass it to another function. By the end of this issue you will be able to:

- write a function the short way, as an arrow function
- keep a function in a variable and hand it back from another function
- tell a function apart from its answer
- pass a function to another function you wrote, and call it there

## The request from Ines

> **Ines:** On Saturdays and Sundays everything is twenty percent off. Theo says we could have a market rule and a wrapping rule too. I don't want a new pricing function every time we have an idea. Can a rule be something we just plug in?

All four tasks are in `src/callbacks.js`.

## Arrow functions: the short way

You know the long way to write a function:

```js
function addMilk(cups) {
  return cups + 1
}
```

An arrow function says the same thing in fewer words. You keep it in a `const`, write the parameters in round brackets, then `=>`, then what it gives back:

```js
const addMilk = (cups) => cups + 1
```

Without curly braces after `=>`, the value after it is given back by itself. When the function needs several lines, use braces, and then you need `return` as usual:

```js
const brewMinutes = (tea) => {
  if (tea === 'green') {
    return 2
  }
  return 4
}
```

An arrow with braces and no `return` gives back `undefined`, just like a long function would. You call both kinds the same way: `addMilk(2)`.

## A function is a value

Look at `addMilk` without round brackets. It is not a number, it is the function itself, kept in a variable. You can put it in another variable, or hand it back from a function:

```js
const strong = (minutes) => minutes + 2
const mild = (minutes) => minutes

function brewFor(guest) {
  if (guest === 'Mira') {
    return strong
  }
  return mild
}
```

`brewFor('Mira')` gives back the function `strong`, not a number. Print it and Node shows `[Function: strong]`.

The round brackets are what make a function run. `strong` is the function; `strong(4)` runs it and is its answer, `6`. Mixing the two up is the most common mistake here. With brackets where you meant the function, you get an answer, often `NaN` because nothing was handed in. Without brackets where you meant the answer, you get a function.

## Passing a function to a function

If a function is a value, it can be a parameter. A function you hand to another function, for it to call, is called a callback:

```js
function brewTime(minutes, adjust) {
  return adjust(minutes)
}

brewTime(4, strong)              // 6
brewTime(4, mild)                // 4
brewTime(4, (minutes) => 10)     // 10
```

`brewTime` does not know which rule it will get. It only knows it gets a function, and calls it. The rule is plugged in from outside, and a new rule needs no change to `brewTime` at all. The last call writes a rule right there, as an arrow function, without giving it a name first.

A callback can also be called many times, once per thing, which is how one function can ask different questions:

```js
function anyCharacter(text, isWanted) {
  for (const character of text) {
    if (isWanted(character)) {
      return true
    }
  }
  return false
}

anyCharacter('Earl Grey', (character) => character === ' ') // true
```

## Your work in this issue

Open `src/callbacks.js`. Task 1 rewrites an existing function the short way. The two price rules above Task 2 are arrow functions kept in variables; Tasks 2 and 3 hand them around and call them. Task 4 calls a test for every character. Check calls your functions with rules and tests of its own. Run `node src/callbacks.js` after each task. Keep the function names and the last line of the file as they are.
