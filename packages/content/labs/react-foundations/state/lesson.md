# A value the screen remembers

## What you will be able to do

The kiosk now calls the desk when it is pressed, but nothing on its own screen changes. A screen that responds has to remember something between one click and the next, and show the new value. In React that memory is called state. By the end of this issue you will be able to:

- say why a plain variable cannot be the memory of a component
- keep a value in state with `useState`, and change it so the screen follows
- update a value from the one before, when one click changes it more than once
- keep more than one piece of state in a component

## The request from Elspeth

On busy days the museum may only hold so many people, so a volunteer at the door counts visitors in and out.

> **Elspeth:** We used to count on a clicker, and someone wrote a screen to replace it. The In button does nothing, the number sits at 0 all day, and Out and the doors aren't there at all. Family should count all four of a family. And when we close at five, I want the screen to show it, so nobody waves people in after closing.

Open `src/DoorCounter.jsx`, press In a few times, and open the Browser panel's console.

## Why a plain variable forgets

The console shows `inside is now 1`, then `2`, then `3`. The variable does change. The screen does not, for two reasons.

First, React has no idea anything happened. It drew `DoorCounter` once, put the result on the page, and nothing asked it to draw again. Changing a variable is not a request to draw.

Second, even if React did draw again, it would call `DoorCounter` again, and the first line of the function, `let inside = 0`, would start the count over. A variable inside a component lives for one draw only.

What the component needs is a value that React keeps for it between draws, and a way to change it that also asks React to draw again.

## useState

That is what `useState` gives you. Import it from `react` and call it at the top of the component:

```jsx
import { useState } from 'react'

function LapCounter() {
  const [laps, setLaps] = useState(0)
  return <button onClick={() => setLaps(laps + 1)}>Laps of the loop: {laps}</button>
}
```

`useState(0)` returns two things in an array, and the square brackets take them out by position: the value for this draw, and a function that sets a new value. The first time the component is drawn, `laps` is the starting value, `0`. When `setLaps(1)` is called, React remembers 1 and draws the component again; this time `useState` returns 1. Each `LapCounter` on the page has its own count.

Some rules come with it. Call `useState` at the top level of the component, never inside a handler, a condition or a loop, and never outside a component: there, the page stops with `Cannot read properties of null (reading 'useState')`, and the console says `Invalid hook call`. Do not assign to the value: `laps = laps + 1` stops the bundler with `Cannot assign to "laps" because it is a constant`. And never call a setter while drawing: `onClick={setLaps(laps + 1)}` sets state, which draws again, which sets state again, until React gives up with `Too many re-renders`.

## Each draw sees one value

Inside one draw, `laps` is a fixed number. Setting state does not change it; it asks for the next draw. So this handler adds one, not two:

```jsx
function twoLaps() {
  setLaps(laps + 1)
  setLaps(laps + 1)
}
```

Both lines read `laps` from the same draw, say 5, and both ask for 6. When the next value depends on the one before, hand the setter a function instead of a value. React calls it with the newest value, after any changes already asked for in the same click:

```jsx
function twoLaps() {
  setLaps((n) => n + 1)
  setLaps((n) => n + 1)
}
```

Now the first call turns 5 into 6, and the second turns 6 into 7.

## More than one piece of state

A component can call `useState` as often as it needs, once per value, each with its own name. They are separate: setting one leaves the other as it was.

```jsx
const [laps, setLaps] = useState(0)
const [running, setRunning] = useState(false)
```

Anything that can be worked out from state during the draw, like a label that depends on `running`, is not state of its own: compute it in the JSX with the conditional operator you already know. And a button can be switched off with `disabled={...}`, which takes true or false.

## Your work in this issue

Everything happens in `src/DoorCounter.jsx`. Replace the plain variable with state so that In counts, then make Out count visitors out without going below 0, make Family count all four, and add the doors as a second piece of state. The check draws a new counter for every case, presses the buttons several times in a row, and reads the count after each press.
