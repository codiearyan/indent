# In step with the world outside

## What you will be able to do

Some screens have to keep in step with something React knows nothing about: a timer, a listener on the window, a device that sends messages. That is what effects are for. By the end of this issue you will be able to:

- run code after the screen is drawn, with `useEffect`
- say when it runs again, with its dependency list
- clean up after it, so nothing outside keeps running for a screen that is gone
- tell when a value needs no effect at all, and read what React prints when an effect goes wrong

## The request from Wilf

Every tram on the line carries a tracker that radios the depot each time it reaches a stop.

> **Wilf:** I want a screen in the depot that shows where a tram is right now, and the stops it still has to go. Pick a tram, see where it is. At the moment it just says it's waiting, all day long.

Open `src/Whereabouts.jsx` and `src/tracker.js`. `follow(number, onStop)` starts listening to one tram, calls `onStop` with each stop it reports, and returns a function that stops listening. Nothing calls it yet.

## What an effect is for

React may draw a component as often as it likes, so drawing only works out what to show. Start a timer or a listener while drawing and you start a new one on every draw. An effect is code React runs after the screen is drawn:

```jsx
import { useEffect, useState } from 'react'

function HelpKey() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    function onKey(event) {
      if (event.key === '?') setOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return open ? <p>Press a tram to see its story.</p> : null
}
```

Call `useEffect` at the top of the component, like `useState`. When something outside calls back with news, the callback sets state, and React draws again.

## The dependency list

The second argument says when the effect runs again. React compares each value in the list with the one from the draw before, and runs the effect again only when one has changed.

- `[]`: once, when the component first appears.
- `[room]`: when it appears, and again whenever `room` changed.
- No list at all: after every single draw.

The rule is short: list every value from the component that the effect uses, its props, state and anything worked out from them. React prints nothing when one is missing. The screen just goes on using the old value. Leave the list out instead, and the effect runs after every draw: if each callback sets state, each one draws again, and the effect starts over each time.

## Cleaning up

The function an effect returns is its cleanup. React calls it when the component goes off the screen, and before it runs the effect again. Whatever the effect starts, the cleanup stops: `removeEventListener` for `addEventListener`, `clearInterval` for `setInterval`. Return the function itself. `return stop()` calls it at once, so the effect stops what it has only just started.

Without a cleanup, the listener outlives the screen. React says nothing about state set on a component that is gone, either: the calls go on, and nobody sees them. The tracker in this issue logs when it starts and stops following, so the console shows it.

In this issue `main.jsx` wraps the app in `<StrictMode>`. While you develop, it draws each component, takes it off and puts it back once more, so the console shows following, stopped, following. That is on purpose: an effect that cleans up properly cannot tell the difference, and one that does not shows itself twice. The check does not do this.

## When a value changes

When a value in the list changes, React calls the cleanup from the last run, then runs the effect again with the new value. So a component that listens to one source at a time stops the old one and starts the new one, in that order.

What it showed for the old source is still in state, though. If the screen must not show it for the new one, set the state back at the start of the effect, before the first news arrives.

## When you do not need an effect

An effect is for keeping in step with something outside React. A value that can be worked out from props and state is not that:

```jsx
const [seatsLeft, setSeatsLeft] = useState(0)
useEffect(() => {
  setSeatsLeft(seats - booked.length)
}, [seats, booked])
```

This draws the screen with the old number, then the effect sets state and draws it again. For a moment the screen is wrong, and every value the effect forgets to list makes it wrong for longer. Work it out while drawing instead: `const seatsLeft = seats - booked.length`.

Leave the list off an effect like this and it sets state after every draw, which causes a draw, which runs it again. If each time is a new array, it never stops: the screen is drawn over and over, and React prints `Maximum update depth exceeded` in the console.

## Your work in this issue

Everything happens in `src/Whereabouts.jsx`. First follow the tram from an effect and show where it is, then stop following when the screen goes, then follow whichever tram is chosen, and last take the effect out of `LineMap`. The check uses a tracker of its own that sends reports only when it says so and writes down every follow and every stop, and it counts how many times `LineMap` is drawn.
