# A hook of your own

## What you will be able to do

When two components need the same state and the same effect, copying the code means fixing every mistake twice. A function of your own can hold them both, as long as it follows the rules every hook follows. By the end of this issue you will be able to:

- pull state and an effect out of a component into a hook of your own
- choose what the hook returns, and use it in more than one component
- say why each use of a hook has its own state
- follow the rules of hooks, and read what React says when they are broken

## The request from Wilf

The depot screen you built for Wilf now has a sister: a sign on the platform at Pithead that says where the next tram is.

> **Wilf:** Somebody copied the depot screen's code into the platform sign, so every time I fix one I forget the other. When no tram is due, the sign says so, but the console says it's still following the last tram, and when that tram comes back it gets followed twice. And while you're in there, the ticket hall wants a board with every tram on the line.

Open `src/Screens.jsx`. `Whereabouts` and `PlatformSign` each keep the stop in state and follow the tram from an effect, with the same lines. `src/useTramStop.js` is empty.

## A hook is a function that calls hooks

Take the lines both components share and move them into a function whose name starts with `use`. Here is the help key from the lesson on effects, pulled out of its component:

```jsx
import { useEffect, useState } from 'react'

export function useKeyPressed(key) {
  const [pressed, setPressed] = useState(false)
  useEffect(() => {
    function onKey(event) {
      if (event.key === key) setPressed(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [key])
  return pressed
}
```

Any component can now write `const helpOpen = useKeyPressed('?')`. The state and the effect work exactly as they did in the component: the effect runs after the component that called the hook is drawn, and setting the state draws that component again.

What makes it a hook is that it calls hooks. A function without any is just a function, and can be called anywhere. The name is a promise to the reader: React does not look at it and prints nothing when a hook is called `keyPressed`. But the rules below apply to it all the same, and only the name says so.

## What a hook returns

A hook returns whatever the component needs, and nothing it does not. One value, like `pressed`. A pair, like `useState`, when the component should also be able to change it. An object, when there are several things with names. The component decides what to draw with it. If the hook returns nothing, the component has nothing to show.

## Each use has its own state

A hook shares code, not state. Call `useKeyPressed('?')` in two components and each gets its own `pressed`, because the `useState` inside belongs to whichever component called it. That is usually what you want: two signs following two trams.

Keep the value in a variable outside the hook instead and every component that uses it shares one, the way a variable outside a component did in the children's cab. When two components really should share a value, lift it into their parent, as you did for the tram guide in the shed.

## The rules hooks follow

React does not know hooks by name. It knows them by order: the first hook a component calls on this draw gets the first piece of state it had last draw, the second gets the second. So:

- Call hooks at the top of a component or of another hook, on every draw, in the same order.
- Never inside an `if`, a loop, or after an early `return`.
- Never in an event handler or a plain function. React stops with `Invalid hook call. Hooks can only be called inside of the body of a function component.`

Break the order and React notices if it can. When some hooks ran before the condition, it stops with `Rendered more hooks than during the previous render.`, or `Rendered fewer hooks than expected. This may be caused by an accidental early return statement.`, and the console may also say `React has detected a change in the order of Hooks`. When a component skips every hook it has, React may say nothing at all, or only `Internal React error: Expected static flag was missing`, which does not point at your code. Its state starts again from the beginning, and the cleanup of its effects never runs. That is what is wrong with the platform sign.

The fix is never to call a hook less often. Call it every time, and let it do nothing when there is nothing to do: an effect can return early before it starts anything.

The same goes for a list. `keys.map((key) => useKeyPressed(key))` works until the list grows, then React stops. Give each item a component of its own, and let that component call the hook once.

## Your work in this issue

Write `useTramStop(number)` in `src/useTramStop.js` from the lines the two screens share, then use it in both and remove their copies. Then make the platform sign call it on every draw, even with no tram due, and last write the board for the ticket hall. The check draws screens of its own that call your hook, puts your screens on a page with a hook of its own that writes down every call, and uses a tracker that sends reports only when it says so.
