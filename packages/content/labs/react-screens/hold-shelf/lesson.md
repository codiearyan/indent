# A hold button that does nothing

## A customer on the phone

The stock shows up now, and Noor is pleased. Then the phone rings.

> **Noor:** That was a regular. She wants the jazz record and the blues one kept until Saturday. I pressed Hold on both and nothing happened. The shelf on the right still says nothing is on hold, and the header still says zero.

Every card has a Hold button, but no click handler. And even with a handler, there is nowhere to keep the answer. In `App.jsx` the held records are a plain `const heldRecords = []`. This issue gives the screen a memory.

## Why a plain variable forgets

A component is a function, and React calls it again every time it draws the screen. Each call starts from the top, so any variable declared inside it is made fresh.

```jsx
function Counter() {
  let presses = 0
  return <button onClick={() => presses++}>{presses}</button>
}
```

Clicking changes `presses`, but React does not know anything changed, so it never draws again. And if something else made it draw, `presses` would start again at zero. Two things are missing: a value that survives between renders, and a way to tell React to draw again.

## State is memory that React keeps

`useState` gives you both. You call it at the top of a component with a starting value, and it returns the current value and a function that sets a new one.

```jsx
import { useState } from 'react'

function Counter() {
  const [presses, setPresses] = useState(0)
  return <button onClick={() => setPresses(presses + 1)}>{presses}</button>
}
```

React keeps `presses` for this component between renders. Calling `setPresses` stores the new value and asks React to render again, and on that render `useState` hands back the new value. The screen is always drawn from the current state.

## Where the state lives

The held records matter to three parts of the screen: the cards, which need to know their button label; the shelf, which lists them; and the header, which counts them. State lives in one component, so put it in the closest component that contains all of them. Here that is `App`.

The cards cannot reach `App`'s state directly. Instead, `App` passes data down as props, and passes a function down too. The card calls that function when its button is clicked, and the function, which belongs to `App`, changes the state.

```jsx
<StockList records={stock} heldIds={heldIds} onToggleHold={toggleHold} />
```

Think of it as the card ringing a bell. It does not change anything itself; it tells the component that owns the shelf that someone pressed Hold on this record.

## Give React a new array

There is one trap that catches almost everyone. React decides whether state changed by comparing the old value with the new one. If you change an array in place and set the same array again, React sees the same array and does nothing.

```jsx
// React sees the same array and skips the render.
crates.push(newCrate)
setCrates(crates)

// A new array, so React renders.
setCrates([...crates, newCrate])
```

The same goes for removing. `filter` returns a new array with only the items you keep, so it is the natural way to take something out. When the next value depends on the previous one, pass a function to the setter: `setCrates((current) => [...current, newCrate])`. React calls it with the latest value, which keeps quick double clicks from losing an update.

## Work things out, do not store them twice

Once the held ids are in state, many things follow from them. Which records are on the shelf? Filter the stock by the ids. Is this card held? Check whether its id is in the list. How many are on hold? The length of the list.

None of these need state of their own. If you kept the count in a second state, you would have to remember to update it on every hold and every release, and one day you would forget. Values you can work out during render stay correct on their own.

## Try it

Add the state in `App`, pass the ids and a toggle function down through `StockList` to each card, and let the button call it. Then make the label read Hold or Release from the props, and put the real count in the header. Hold a few records in the Browser panel, release one, and watch all three parts of the screen agree.
