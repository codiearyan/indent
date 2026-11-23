# Telling who listens

## What you will be able to do

The order now lives in one place, but nothing on the screen knows when it changes. In this issue the store learns to tell whoever asked. By the end of it you can:

- let any part of a program listen to the store, and stop listening
- tell every listener after a change, and nobody when nothing changed
- keep a round of telling whole, even when listeners come and go in the middle of it

## The request from Sefton

Hesper liked the one state, and Sefton started moving the order screen onto the store. He came back with a question.

> **Sefton:** The header reads the count from the store when the screen opens, and then never again. After a change I have to remember to draw the header, the basket and the total, by hand, every time. I forgot the total twice this morning. Can the store tell them?

It can. Whoever needs to know about changes gives the store a function, and the store calls it after every change.

## Who wants to know

A weather station does not phone each display in the building when the temperature moves. Each display asks once to be told, and the station keeps a list. After every reading it goes down the list. A display that is taken away asks to be crossed off.

That is all `subscribe` is. It keeps a function, a listener, and after each change the store calls every listener with two things: the new state, and the state before. With both, a listener can see what changed. Call them once the state has changed, so a listener that asks the store gets the new state too.

`subscribe` gives back a function that crosses the listener off. It is a closure: it remembers which subscription it belongs to, so whoever subscribed does not have to keep the listener around to remove it.

```js
const stop = store.subscribe((state, previous) => draw(state))
// later, when that part of the screen closes:
stop()
```

## Nothing changed, nobody told

Telling costs something: every listener runs, and on a screen that means drawing. So when a change changes nothing, nobody should be told.

There is a better reason, too. A listener may set state when it is told, say one that keeps a count in step with the lines. If setting a value the state already has starts a new round, that listener is told again, sets the same value again, and the two never stop.

So when every key of the part already has that very value, the store keeps the state object it had and tells nobody. Compare each value with `Object.is`. It is `===` with two differences: `Object.is(NaN, NaN)` is true, where `NaN === NaN` is false, and it tells `0` from `-0`.

"That very value" matters. A new array with the same words is a new value, and so a change. The store never looks inside: that would be slow, and it would miss the day somebody does change what is inside.

## A round that stays whole

Telling the listeners after one change is a round. Listeners do surprising things during a round. A popup that only needed to hear one change stops itself. One part closes another part of the screen, which stops its listener. A part opens a new part that subscribes.

Removing from an array while a loop walks it is the classic trap:

```js
const queue = ['a', 'b', 'c']
queue.forEach((name, i) => {
  if (name === 'a') queue.splice(i, 1)
  console.log(name)
})
// a, c: 'b' moved into the place the loop had already passed
```

The rule that keeps a round simple: a round tells everyone who was listening when it began, once each, in order. Someone stopped during the round still hears this change, and from the next one on, nothing. Someone who starts listening during the round waits for the next change. Looping over a copy of the list, made when the round begins, gives you exactly that.

One more case. The same function may be subscribed twice, by two parts of the screen that draw the same way. That is two subscriptions, told twice, and each stop function removes its own. A `Set` of functions keeps each function only once, and removing the first entry that holds the same function removes the wrong one; give each subscription an entry of its own.

## Your work in this issue

All three tasks are in `src/store.js`: first `subscribe` and the telling in `setState`, then staying quiet when nothing changed, then keeping a round whole. Try your work with:

```sh
node src/try.js
```

Three parts of the screen and a paper picker listen and print when they are told. The paper picker stops itself during the first round; watch whether the note box after it still hears. The check uses listeners of its own on stores of its own, and stops any round that never ends.
