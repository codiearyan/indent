# Only the part you read

## What you will be able to do

Every listener now hears about every change. That is right for the store, and wasteful for a screen: the header redraws when someone types a note. In this issue each part of the screen hears only about its own part. By the end of it you can:

- pick one part out of the state with a selector, and watch only that part
- say what "changed" means for a number, a text and an object made new every time
- compare small objects key by key, one level deep

## The request from Sefton

The order screen was on the store, every part listening. Sefton timed it on the shop's old laptop.

> **Sefton:** Typing a note redraws the header, the basket and the total on every key. On the counter laptop you can see the letters lag. The header only shows a count. Why does it hear about my note at all?

Because it listens to the whole state. What it needs is to hear about the count, and only when the count changes.

## A selector picks a part

A selector is a small function from the state to the part a reader needs:

```js
const songTitle = (state) => state.playing.title
const queueLength = (state) => state.queue.length
```

`watch(store, selector, listener)` is a listener that stands between the store and that part. It reads the part once when it starts. After each change, it runs the selector on the new state and compares the result with the part it saw last. Only when they differ does it remember the new part and tell its listener, with the new part and the one before.

`watch` is built on `subscribe`, and returns the stop function `subscribe` gave it. It adds no list of its own.

## What "changed" means

`watch` compares parts with `Object.is`, and how that behaves depends on what the part is.

A number or a text is compared by its value. `queueLength` gives a new number every time it runs, but `3` is `3`, so a change that leaves the queue's length alone tells nobody. The same holds for a text worked out each time, such as names joined with commas.

An object or an array is compared by identity: is it the very same object? A selector that returns `state.queue` gives the same array until somebody replaces it. That is cheap and exact, because the store never changes an old state in place: a new array means a change.

The trouble starts with a selector that builds an object:

```js
const nowPlaying = (state) => ({ title: state.playing.title, paused: state.paused })
```

Every run makes a new object, so `Object.is` calls every round a change, even one that touched neither the title nor the pause. Only whoever wrote the selector knows what "the same" means for it. So `watch` takes a fourth argument, `isEqual(previousPart, part)`. When it is given, it decides alone, and `true` means the part did not change.

## One level down

Most selectors that build an object build a small one, a few values side by side. For those, one comparison does: same keys, and each value the same by `Object.is`. That is a shallow comparison:

```js
shallowEqual({ title: 'Rain', paused: false }, { title: 'Rain', paused: false }) // true
shallowEqual({ queue: ['Rain'] }, { queue: ['Rain'] })                            // false
```

The second answer is false on purpose. The two `queue` arrays are two arrays, and a shallow comparison does not look inside them. It looks one level down, never further, which keeps it fast and predictable. A selector that wants the queue to count as the same hands over the queue itself, which stays the same array until it changes.

Two shortcuts look right and are not. `JSON.stringify(a) === JSON.stringify(b)` depends on the order the keys were written in, looks inside every value, and turns a key holding `undefined` into no key at all. And comparing only the keys of the first object misses a key that the second one has more: count both.

A key one object lacks reads as `undefined` there, just like a key that holds `undefined`, so ask whether the second object has the key at all, with `Object.hasOwn`.

## Your work in this issue

All three tasks are in `src/store.js`: first `watch` with `Object.is`, then its `isEqual`, then `shallowEqual`. Try your work with:

```sh
node src/try.js
```

The header, the total and the paper picker each watch only what they show, and print when they are drawn again; a summary line watches an object with `shallowEqual`. Choosing paper should draw only the paper picker and the summary; typing a note should draw nothing. The check watches parts of its own on stores of its own.
