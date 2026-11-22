# Values and variables

## What you will be able to do

The laptop prints the parcel note, and Ines is pleased. Now it is mid-morning, the first delivery of the day has arrived, and the shop needs to keep count of what is on its shelves. A count has to be remembered and changed, and that is what variables are for. By the end of this issue you will be able to:

- tell text values from number values
- keep a value under a name with `const` or `let`
- give a `let` a new value as things change
- choose names that say what a variable holds

## The request from Ines

> **Ines:** The cedar candles just came in. I write the count on a sticky note, then cross it out every time someone buys one, and by Friday nobody can read it. Can the laptop keep the count instead? And Theo left a file where things are called x and y. I have no idea what they are.

All four tasks are in `src/variables.js`.

## Values

Everything a program works with is a value. In this issue you meet two kinds.

**Text**, which programmers call a string, sits inside quotes: `'Wickhollow'`, `'cedar'`, `'Open from nine'`. The quotes are not part of the text; they show Node where it starts and ends.

**Numbers** are written as they are, with no quotes: `24`, `0`, `1250`. You can do sums with them, like `7 - 2` or `3 + 4`. The next issue goes much further with numbers.

`'24'` with quotes is text that happens to look like a number. Keep that in mind; it matters later.

## Variables keep a value under a name

A variable is a name that holds a value, so you can use the value later without typing it again:

```js
const kettleSize = 12
console.log(kettleSize)
```

Read the first line as "make a variable called `kettleSize` and put `12` in it". The `=` here does not mean "equals" as in maths; it means "store the value on the right under the name on the left". When you write the name later, Node uses the value it holds, so the second line prints `12`.

`console.log` can print several things on one line, separated by commas. Text in quotes is printed as it is, and a variable's name is replaced by its value: `console.log('Kettle size:', kettleSize)` prints `Kettle size: 12`.

A variable can also start with the value of another variable:

```js
const cupsPerPot = 4
const cupsToday = cupsPerPot
```

## const or let

There are two keywords for making a variable.

`const` makes a variable that keeps its first value forever. Use it for things that do not change, like the name of a tea or the size of a kettle.

`let` makes a variable you can change later. To give it a new value, write its name, `=` and the new value, with no keyword in front:

```js
let cupsLeft = 10
cupsLeft = cupsLeft - 3
console.log(cupsLeft)
```

The second line reads "take the value `cupsLeft` has now, take 3 away, and store the result back in `cupsLeft`". It prints `7`.

A variable is made only once. Writing `let cupsLeft = ...` a second time stops Node before it runs anything, with `SyntaxError: Identifier 'cupsLeft' has already been declared`.

If you try to change a `const`, Node stops with `TypeError: Assignment to constant variable`. That is a useful error: it means a value you said would never change is being changed. Either the code is wrong, or the variable should have been a `let`. The error points at the line that changes the value, but when the variable should have been a `let`, the fix is on the line that made it.

A good habit is to start with `const` and switch to `let` only when the value really has to change.

## Good names

Names have a few rules: no spaces, no starting with a digit, and capital letters count, so `teaName` and `teaname` are two different variables. When a name has several words, JavaScript joins them and starts each new word with a capital letter: `cupsLeft`, `kettleSize`, `firstCustomerName`.

Beyond the rules, a good name says what the variable holds. `x` tells the next reader nothing; `cupsLeft` tells them everything. Code is read far more often than it is written, so names are worth a few extra letters.

When you rename a variable, rename it everywhere it is used. If you miss one, Node stops with a `ReferenceError` that names the variable it no longer knows, and the line it was on.

## Your work in this issue

Open `src/variables.js`. Near the top, under "This morning's numbers", are two variables the shop gives you: how many cedar candles were delivered and how many were sold. Check runs your file with other numbers in their place, so build on those names rather than on the numbers. Do the tasks in order under their `// Task` comments, and run `node src/variables.js` after each one to see the count change.
