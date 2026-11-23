# One place for state

## What you will be able to do

Every screen keeps state: what is in a basket, which tab is open, whether something is loading. You have likely used a store for it, a small library that holds the state in one place. In this repo you write one yourself, in plain JavaScript, so you know what happens each time you read or change it. By the end of this issue you can:

- keep a screen's state in one object, inside a store
- change it by joining in a part, or with a function of the state before
- make every change a new object, so a state read earlier never changes under anyone

## The request from Hesper

Ashgrove Press is a letterpress shop with two old presses, run by Hesper. Sefton works the counter and writes the small programs the shop runs on; Idris keeps the books and the price list. Customers build their orders on an order screen Sefton wrote.

> **Hesper:** A customer had two lines in the basket and the header said three. Another removed a line and the total stayed where it was. Sefton fixes one corner and another goes wrong. I want the order to live in one place, so every part of the screen shows the same thing. Can you write us that?

Open `src/old-screen.js`. The header keeps its own count, the basket its own lines, the total its own sum, and every change has to remember to update every copy. Run `node src/try.js` and the first lines show what that does: after one line is added and two are removed, the header says `Basket (0)` above two lines, and the total still counts the cards.

## State in many places

Think of a music player whose title bar keeps its own "now playing" and whose play button keeps its own "is playing". One day a song ends, one of them hears about it, and they disagree. The fix is not more care. It is one place that holds what is playing, and both parts reading from it.

That is a store. It holds the whole state in one object, and parts that can be worked out from it are worked out, not stored. The basket count is the length of the basket; keep it anywhere else and it can drift.

## A store is a variable and two functions

The smallest store is a variable and the two functions that can reach it:

```js
function createCounter(start) {
  let count = start
  return {
    read: () => count,
    bump: () => {
      count = count + 1
    }
  }
}
```

`count` belongs to one call of `createCounter`. The two functions written inside it keep that variable for as long as they exist; that is a closure. Call `createCounter` twice and you get two counters that never share their count. A variable at the top of the file would be one count for the whole program.

Your `createStore(initial)` works the same way, with a state object instead of a number, `getState()` to read it and `setState()` to change it.

## Joining a part in

Most changes touch one or two keys of the state: the paper, or the basket. So `setState` takes only the part that changes, and joins it in. Spreading two objects into a new one does exactly that, and when both have a key, the one spread last wins:

```js
const lamp = { colour: 'green', watts: 40, on: false }
const lit = { ...lamp, ...{ on: true } }
// { colour: 'green', watts: 40, on: true }
```

Only the top keys are joined. If the part has a whole object under a key, it replaces the old one whole; the store does not reach inside it.

Some changes depend on the state before: one more job, or the basket without one line. For those, `setState` takes a function. The store calls it with the state as it is at that moment and joins in the part it returns. Two such changes in a row then each start from what the one before left.

Anything else is a mistake: spreading `null` or a number into an object adds nothing and says nothing. So a part that is not an object throws a `TypeError`, on the line that made the mistake. Note that `typeof null` is `'object'`.

## An old state never changes

Code elsewhere may still hold a state it read a moment ago, to compare it with the new one or to draw from it. If the store writes into that object, its values change under that code's feet:

```js
const before = store.getState()
store.setState({ paper: 'linen' })
before.paper // still 'cotton', as it should be
```

`Object.assign(state, part)` and `state[key] = value` both write into the old object. A new object made with spread leaves it alone. So every change makes a new state object, and the store points at it. The old one stays exactly as it was, and so does the object you passed to `createStore`.

This is also what lets anyone tell that something changed at all, cheaply: a different object means a change. You will lean on that in the next issues.

## Your work in this issue

All three tasks are in `src/store.js`: first `nextState`, `createStore`, `getState` and `setState`, then changes made with a function, then making sure the old state never changes. Try your work with:

```sh
node src/try.js
```

It makes the same changes on the old screen and on a screen drawn from your store, so you can compare them. The check never uses the shop's order. It makes stores of its own, a fresh one for every case.
