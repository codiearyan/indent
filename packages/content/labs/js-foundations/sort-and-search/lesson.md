# Sorting and searching

## What you will be able to do

The shelf, its prices and its stock are all lists now. Theo wants to put them on the shop's page in an order people can read, and Ines wants quick answers about the stock before Saturday. Putting a list in order is called sorting, and it has one surprise in store for numbers. Asking a yes or no question about a whole list is just as common. By the end of this issue you will be able to:

- sort a list with `sort`, and say why it changes the list
- sort numbers the right way with a compare function
- sort a copy, so the list you were handed stays as it was
- ask whether some or every item passes a test, with `some` and `every`

## The request from Theo

> **Theo:** I sorted the prices for the page, cheapest first, and got 1100, 1250, 1800, 2000, 4500 and then 900. Nine hundred last! Ines also wants to know two things every Friday: is any scent running low, and do we have enough of everything for the market.

All five tasks are in `src/sorting.js`.

## sort changes the list

`sort` puts the items of a list in order and gives back the list:

```js
const guests = ['Oskar', 'Ada', 'Mira']
guests.sort() // ['Ada', 'Mira', 'Oskar']
```

Unlike `map` and `filter`, `sort` does not make a new list. It changes the one it is called on, and what it gives back is that same list. After the line above, `guests` itself is in a new order. You know from the issue on copies why that matters: if `guests` was handed to your function, its owner now finds it shuffled.

The fix is the one you know. Copy first, then sort the copy:

```js
function alphabetical(names) {
  return [...names].sort()
}
```

## Numbers need a compare function

Without help, `sort` compares every item as text, letter by letter, the way a dictionary does. For names that is what you want. For numbers it is not:

```js
const minutes = [9, 30, 100, 4]
const asText = [...minutes].sort() // [100, 30, 4, 9]
```

As text, `'100'` starts with `'1'`, so it comes before `'30'`, which comes before `'4'`. That is what happened to Theo's prices.

You fix it by handing `sort` a compare function. `sort` calls it with two items, `a` and `b`, and looks at the number it gives back:

- below 0: `a` comes first
- above 0: `b` comes first
- 0: they are equal, and keep their order

Subtracting gives exactly that. `a - b` is below 0 when `a` is smaller, so the smaller comes first:

```js
const smallFirst = [...minutes].sort((a, b) => a - b) // [4, 9, 30, 100]
const largeFirst = [...minutes].sort((a, b) => b - a) // [100, 30, 9, 4]
```

Swap the two to get the largest first. A compare function that gives back `true` or `false`, like `(a, b) => a > b`, is a common mistake: `sort` needs a number, and the order comes out wrong in ways that are hard to spot.

## some and every

Sometimes the question about a list has a yes or no answer. `some` asks "is this true for at least one item?":

```js
const queue = [2, 5, 1]
queue.some((people) => people > 4) // true
```

`every` asks "is this true for all of them?":

```js
queue.every((people) => people > 0) // true
queue.every((people) => people > 1) // false
```

Both stop as soon as they know: `some` at the first true, `every` at the first false. Both take a function the way `filter` does, and you can hand them one you wrote earlier, by its name.

On an empty list, `some` gives `false`, because no item passes, and `every` gives `true`, because no item fails. That can look odd at first, but it fits the questions: "is any table full?" is no, and "are all the tables clean?" is yes, when there are no tables at all.

## Your work in this issue

Open `src/sorting.js`. The shelf, its prices and its stock are at the top, in the same order. Tasks 1 to 3 sort copies: names, prices from the lowest, and the few highest prices. Task 4 asks whether any scent needs pouring, with a helper you write yourself, and Task 5 asks whether every scent is ready for the market. Run `node src/sorting.js` after each task. Check calls your functions with lists of its own and makes sure the lists it hands in come back unsorted. Keep the function names and the export line at the bottom as they are.
