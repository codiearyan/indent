# Changes with names

## What you will be able to do

The screen reads the store well now. Changing it is another matter: any line of code can call `setState` with anything. In this issue every change gets a name and a home beside the state. By the end of it you can:

- keep a store's actions beside its state, made once with the store
- build one action on another
- write an action that waits for an answer, and keeps the screen honest while it waits

## The request from Idris

Idris keeps the books, and the prices on the order screen come from his price list, which lives on the workshop computer and takes a moment to answer.

> **Idris:** An invoice came out with two lines for the same invites. I went looking for the code that adds to the basket and found it in four places, written four ways. And when the price list is slow, the total shows nothing at all, and customers think the screen is broken. I want every change to the order to have a name, written once, and the screen to say when it is waiting.

## Changes with names

An action is a function that knows how to make one change: `add(item, quantity)`, `remove(item)`. Written once, beside the state, it is the only place that change is made, so it is the only place a rule such as "one line per item" has to live.

The store gets them from a function you pass as its second argument:

```js
const player = createStore({ queue: [], volume: 5 }, (store) => ({
  louder() {
    store.setState((state) => ({ volume: state.volume + 1 }))
  }
}))
player.actions.louder()
```

`createStore` calls that function once, with the store itself, and keeps what it returns as `store.actions`. Without one, `store.actions` is an empty object. The actions reach the state through the store they were given, so they work wherever they are called from, even taken out of the object: `const { louder } = player.actions`.

## An action builds on another

Some changes are other changes, repeated. "Order again" puts every line of an earlier order into the basket, the way "add" would. If it carries its own copy of the adding code, the two will drift apart, and that is how an invoice gets two lines for one item.

So one action calls the other. Through `store.actions`, not `this`: a screen hands actions around on their own, as `onClick={reorder}`, and then `this` inside them is not the actions object. That is also why the store sets `store.actions` on the very object it gave the function: by the time any action runs, the others are there.

```js
playAlbum(tracks) {
  for (const track of tracks) store.actions.enqueue(track)
}
```

Actions keep the rules of the earlier issues. The basket is an array in the state, so an action builds a new one with `map`, `filter` or spread. Pushing into the old array hands the store the same array back, which it counts as no change: nobody is told, and the screen shows the old basket. And a change that changes nothing, such as removing an item that is not there, should not call `setState` with a new array that holds the same lines.

## An action that waits

Loading the prices is a change too, but it takes time, so the action is an `async` function. Between asking and the answer the screen is still there, people still click, and the state should say what is going on:

```js
async loadLyrics() {
  store.setState({ fetching: true, failure: null })
  try {
    const lyrics = await fetchLyrics()
    store.setState({ lyrics, fetching: false })
  } catch (error) {
    store.setState({ fetching: false, failure: error.message })
  }
}
```

Four things in it are easy to get wrong.

- The waiting state is set at once, before `await`, so a listener can draw "Loading" right away. A new load also clears an old failure.
- When it is done, it sets only the keys it changes. A state read before the wait is old by the time the answer comes; spreading it back in would undo every change made meanwhile.
- A failure goes into the state, as its message. If it escaped as a rejected promise, the button that called the action would never hear of it, and the screen would say "Loading" for ever.
- It returns the promise, which an `async` function does for you, so code that needs the prices can wait for them.

## Your work in this issue

The first task is in `src/store.js`: the actions beside the state. The other two are in `src/order-actions.js`: the basket's changes, then `loadPrices`. Try your work with:

```sh
node src/try.js
```

It loads the prices while adding posters, orders again from an old order and removes a line. The check of the first task makes stores with actions of its own. The checks of the other two run your actions on a store of their own, so they do not wait on the first task, and put a price list of their own in place of yours, one that answers or fails when the check says so.
