# The order screen on your store

## What you will be able to do

The store is finished: one state, listeners, parts, actions. The order screen customers use is written in React, and it still keeps the order in pieces of its own. In this issue you join the two. By the end of it you can:

- write a hook that gives a component one part of a store, on React's own tool for outside state
- make a component draw again only when its part changed, objects included
- rebuild a screen so every part reads from one store and changes it through its actions

## The request from Hesper

The order screen opens in the Browser panel. It looks fine until you use it.

> **Hesper:** It is the same story as the first day. I added cards, which were already in the basket, and the header said three lines where there were two. Then I removed a line and it still said three. And every time anyone touches the paper, the whole screen redraws. We have a store now that Sefton can explain line by line. Put the screen on it.

Open `src/OrderScreen.jsx`. `OrderScreen` keeps the basket, a separate count, the paper, the note and the prices in five `useState`s and hands them down as props. The count is kept by hand, and wrong in two ways. And since all the state lives at the top, every change draws every part.

## React's tool for outside state

React draws a component again when its own state changes. Your store is not React state, so React does not know it exists. React has a hook for exactly this, `useSyncExternalStore`. You tell it two things: how to listen, and how to read the value now.

```js
import { useSyncExternalStore } from 'react'

function useOnline() {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('online', onChange)
      window.addEventListener('offline', onChange)
      return () => {
        window.removeEventListener('online', onChange)
        window.removeEventListener('offline', onChange)
      }
    },
    () => navigator.onLine
  )
}
```

The first argument takes React's own listener and returns a function that stops it. That is exactly what your store's `subscribe` is. React calls it when the component arrives and calls the stop function when it leaves. The second argument, the read function, React calls whenever it wants the value: while drawing, and each time the listener fires.

Why not `useState` and an effect that subscribes? The effect runs only after the first draw, so a change made in between is missed, and there is no way for React to read the store while it draws. `useSyncExternalStore` was made to close that gap.

So `useStore(selector)` is a read function that runs the selector on `getState()`, handed to `useSyncExternalStore` with the store's `subscribe`.

## When React draws again

When the listener fires, React calls the read function and compares what it returns with what it returned last time, with `Object.is`. Same value: React skips the draw. Different: it draws.

That is why the read function returns the part, not the whole state. The whole state is a new object after every change, so a component that reads it draws after every change, the note and the paper included. A count, a text or the basket array itself stay the same until they truly change.

And it is why a selector that builds an object needs care. A new object on every read is never the same, so React draws, reads again, gets another new object, and draws again, until it stops with "Maximum update depth exceeded". In the console React warns first: "The result of getSnapshot should be cached".

The cure is the `isEqual` of the last issue. Keep the last part in a ref, `useRef`, which survives draws without causing one. When `isEqual(lastPart, part)` says nothing changed, hand React the very part from last time, and React, seeing the same object, skips the draw.

## A screen with one source

With the hook, each part of the screen reads only what it shows and needs no props. The header asks for the basket's length, the basket for the basket, the total for the basket, prices, loading and error together, with `shallowEqual`. Buttons and fields call the store's actions; the new `choosePaper` and `writeNote` in `order-actions.js` are there for the paper and the note.

The count stops being a second copy. Worked out from the one basket, it cannot disagree with it. `OrderScreen` keeps no state at all: it loads the prices once, from an effect, with the `loadPrices` action, and puts the parts on the page.

## Your work in this issue

The first two tasks are in `src/use-store.js`: `useStore` on `useSyncExternalStore`, then drawing only when the part changed, with `isEqual`. The third is in `src/OrderScreen.jsx`: every part on the store. The screen reloads in the Browser panel every time you save.

The checks of the hook draw components of their own on a store of their own and count every draw. The check of the screen clicks through it with an order and prices of its own, then draws each part alone, inside React's Profiler, and counts its draws while it changes the store. It runs on a correct `useStore`, so the screen is judged even before the hook is done.
