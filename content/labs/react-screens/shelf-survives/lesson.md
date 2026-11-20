# The hold shelf empties on refresh

## Monday morning

The screen finds records now, and staff have started to rely on the hold shelf. On Monday Noor writes again.

> **Noor:** The tablet updated itself overnight and restarted. Every hold from last week is gone, and I have no idea who was promised what. Also, someone added a details panel when you click a title. Nice, but people keep pressing Escape to close it and nothing happens.

Two problems, one idea. State lives in memory, and memory is wiped when the page reloads. The keyboard belongs to the whole page, not to React. Both are things outside React that the screen has to keep in step with. In React, that is the job of an effect.

## Rendering should only describe the screen

A component's body should do one thing: work out what the screen looks like from props and state. It can run many times, at moments you do not choose, so it should not change anything outside itself. Writing to storage, adding a listener to the window, or asking a server are all changes to the world outside. They are called side effects.

`useEffect` is the place for them. You give it a function, and React runs that function after the screen has been updated.

```jsx
import { useEffect } from 'react'

useEffect(() => {
  document.title = `${unread} new messages`
}, [unread])
```

The array at the end is the dependency list. React runs the effect after the first render, and then again only after renders where one of those values changed. An empty array means once, after the first render. No array at all means after every render, which is rarely what you want.

## Saving to the browser

The browser keeps small pieces of text for a page in `localStorage`, and they survive reloads and restarts. It only stores strings, so arrays and objects go through JSON on the way in and out.

```jsx
localStorage.setItem('playlist', JSON.stringify(trackIds))
const back = JSON.parse(localStorage.getItem('playlist'))
```

Saving the hold shelf is a side effect, so it goes in an effect that depends on the held ids. Every hold and every release changes the ids, and the effect writes them again.

## Reading it back, once

Reading is different. You do not want to read storage on every render; you want the saved value to be the starting value of the state. `useState` accepts a function for exactly this. React calls it only when the state is first created, and uses what it returns.

```jsx
const [volume, setVolume] = useState(() => readSavedVolume())
```

If you wrote `useState(readSavedVolume())` instead, the function would run on every render and its result would be thrown away after the first. A function passed without calling it runs once.

Saved data cannot be trusted. On a first visit nothing is there and `getItem` returns `null`. Someone may have saved something by hand, or an older version of the screen may have saved a different shape. `JSON.parse` throws on text that is not JSON. Wrap the read in `try` and `catch`, check that you got an array, and fall back to an empty shelf. A damaged value should never stop the counter screen from opening.

## Effects that clean up after themselves

Listening for a key works like this:

```jsx
useEffect(() => {
  function onResize() {
    setWide(window.innerWidth > 900)
  }
  window.addEventListener('resize', onResize)
  return () => window.removeEventListener('resize', onResize)
}, [])
```

The function returned from an effect is its cleanup. React calls it before running the effect again and when the component leaves the screen. Without it, every run adds another listener and none are ever removed. They pile up, each one still reacting to the keyboard long after it should have stopped.

Note that `removeEventListener` only removes the exact function that was added. That is why the listener is defined inside the effect and kept in a variable that both calls use.

For the details panel, the effect only needs to listen while a record is open. Make it depend on which record is open, skip it when nothing is, and let the cleanup remove the listener when the panel closes.

## Try it

Read the saved shelf when the held state is created, save it in an effect, then add the Escape effect with its cleanup. Hold two records, refresh the Browser panel and see them come back. Open a record and press Escape. The check also counts listeners after several openings, so a missing cleanup will show.
