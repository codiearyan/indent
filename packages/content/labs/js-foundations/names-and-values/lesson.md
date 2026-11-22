# Names and values that break

## What you will be able to do

The morning report prints again, and Theo, a little embarrassed, admits he also tidied the restock sheet: the file Ines runs to see what to order and what to send. It stops with an error too, and this time the errors are of new kinds. They happen while the file is running, and they are about names and values. By the end of this issue you will be able to:

- fix a name Node does not know
- tell why a `const` cannot be given a new value
- fix a name that is made twice
- read "is not a function" and find the missing or extra brackets

## The request from Theo

> **Theo:** I only renamed a few things and moved some lines around, I promise. Now the restock sheet stops halfway. Ines needs it before the supplier calls at ten. Could you find what I broke, and tell me what each error meant?

All four tasks are in `src/restock.js`.

## A name Node does not know

Every name has to be made with `const` or `let` before it is used, and it has to be written the same way each time. Capital letters count, so `teaName` and `teaname` are two different names:

```js
const teaName = 'Oolong'
console.log('Today:', teaname)
```

```
file:///Users/you/workspace/src/tea.js:2
console.log('Today:', teaname)
                      ^

ReferenceError: teaname is not defined
```

A `ReferenceError` means Node met a name that refers to nothing it knows. The message says which name, and the mark sits under it. Look for the line that makes the variable and compare the two letter by letter. The usual causes are a typo or a capital letter. A name used on a line above the one that makes it is a `ReferenceError` too, but in other words: `Cannot access 'teaName' before initialization`. The exact wording of these messages can differ a little between versions of Node.

## A const that has to change

A `const` keeps its first value forever. Giving it a new value stops Node:

```js
const cupsLeft = 10
cupsLeft = cupsLeft - 2
```

```
file:///Users/you/workspace/src/cups.js:2
cupsLeft = cupsLeft - 2
         ^

TypeError: Assignment to constant variable.
```

A `TypeError` means a value was used in a way its kind does not allow. Here the line Node points at is fine: it does exactly what it says. The real question is on the line that made the variable. If the value is meant to change, it should have been made with `let`. If it is not, the new line is the mistake. Errors often point at the place where a problem shows, not where it began, so look up the file as well.

## The same name made twice

A name can be made only once:

```js
let special = 'Scones'
console.log(special)
let special = 'Lemon tart'
```

```
file:///Users/you/workspace/src/special.js:3
let special = 'Lemon tart'
    ^

SyntaxError: Identifier 'special' has already been declared
```

Identifier is another word for name, and declared means made with `let` or `const`. Notice that this is a `SyntaxError`. Node finds it while reading the file, before anything runs, so the `console.log` on line 2 never prints. In a file with several mistakes, this kind is the one you see first, even if it is near the bottom.

To fix it, decide what the second line means. To give the existing `let` a new value, drop the keyword: `special = 'Lemon tart'`. To keep both values, give the second one a new name.

## Brackets where they do not belong

Methods are jobs a value can do, and they run when you write round brackets after their name. Two mistakes with those brackets give the same error.

Brackets on something that is not a method:

```js
const order = 'Two scones'
console.log(order.length())
```

```
file:///Users/you/workspace/src/len.js:2
console.log(order.length())
                  ^

TypeError: order.length is not a function
```

`length` is a number, not a method, so it takes no brackets. "Function" is the word for something that can be run with brackets; a method is a function that belongs to a value.

A method written without its brackets is the other mistake, and the error then shows up on whatever comes next:

```js
const typed = '  Oat milk '
const milk = typed.trim.toLowerCase()
```

```
file:///Users/you/workspace/src/milk.js:2
const milk = typed.trim.toLowerCase()
                        ^

TypeError: typed.trim.toLowerCase is not a function
```

Without brackets, `typed.trim` is the method itself, not the trimmed text. The method has no `toLowerCase` of its own, so the next call fails. When you see "is not a function", read the name in the message and look at every dot in it.

## Your work in this issue

Open `src/restock.js`. Each task has one broken line, and the comment above it says what the lines should print. Run `node src/restock.js`. The first error you see is Task 3's, for the reason above. Fix it, run again, and work through the rest. Keep the lines that hold the shop's own values as they are (`waxJars`, `cedarDelivered`, `cedarSold`, `customerName` and `city`): Check runs each task with values of its own.
