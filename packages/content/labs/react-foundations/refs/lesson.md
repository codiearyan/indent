# A value the screen does not show

## What you will be able to do

State is how a component remembers, and every change to it draws the component again. Some values have to be remembered without being shown: a count that goes somewhere else, or the element on the page that should get the cursor. React keeps those in a ref. By the end of this issue you will be able to:

- keep a value between draws with `useRef`, without causing a draw
- reach an element of your own component through a ref, to put the cursor in it
- tell which values belong in a ref and which in state
- spot a ref read while drawing, which React says nothing about

## The request from Wilf

The shed has a children's cab beside the Foundry Belle, with a screen by the controls.

> **Wilf:** The Ring the bell button rings the real bell, the one from 1911, and I keep a log of how many rings it gets each ride, because the clapper is wearing thin. Don't put the count on the screen, mind, or the kids make a race of it. When a new driver climbs in, they always have to click in the name box before they can type. And Next stop does nothing at all, though somebody swore it worked.

Open `src/Cab.jsx` and `src/bell.js`. `ring()` rings the bell and `logRide(rings)` writes one line in Wilf's log. In the Browser panel both show in the console.

## A value kept between draws

A plain variable in a component starts again on every draw. State survives, but setting it asks React for a draw. `useRef` gives a box that survives every draw and never causes one:

```jsx
import { useRef } from 'react'

function QuizCard({ question }) {
  const tries = useRef(0)

  function answer(choice) {
    tries.current += 1
    if (choice === question.right) sendToDesk(question.id, tries.current)
  }
  // ...
}
```

`useRef(0)` returns an object with one field, `current`, which starts at `0`. React hands the component the same object on every draw, so what you put in `current` is still there next time. Change it and nothing is drawn. Like state, each `QuizCard` on the page has its own.

A variable declared above the component is no substitute. It belongs to the file, so every card on the page shares one.

## Reading a ref while drawing

Read and change `current` in event handlers and effects, not in the body of the component. React does not notice a ref changing, so a ref read while drawing shows whatever it held at the last draw, and the screen stays like that until something else draws it. React prints nothing about it: the screen is just wrong.

Setting `current` while drawing goes wrong too. `tries.current = 0` in the body runs on every draw, so the count starts again whenever the card is drawn for any other reason.

## A ref to an element

A ref can also hold an element of the page. Hand it to the `ref` attribute, and React puts the element in `current` once it is on the page:

```jsx
function GiftSearch() {
  const box = useRef(null)
  return (
    <>
      <input ref={box} placeholder="Search the shop" />
      <button onClick={() => box.current.focus()}>Search</button>
    </>
  )
}
```

Until the element is on the page, `current` is `null`. Call `box.current.focus()` in the body of the component and the page stops with `Cannot read properties of null (reading 'focus')`. In a handler it is safe: by the time anyone can press the button, the input is there. Hand the attribute the ref object itself, not `box.current`, and not a name in quotes: React stops on that with `Expected ref to be a function, an object returned by React.createRef(), or undefined/null.`

Why not `document.querySelector('input')`? It looks through the whole page and finds the first match. Put two search boxes on one screen and the button of the second focuses the first. A ref always points at the element its own component drew.

## What the screen shows stays in state

A ref is not a faster kind of state. Anything the screen shows has to be in state, because only setting state tells React to draw. Keep a value the screen shows in a ref and the screen ignores every change, until something else happens to draw the component and the value jumps.

The question to ask is: does this value appear on the screen? If it does, state. If it is only used in a handler, sent somewhere, or points at an element, a ref.

## Your work in this issue

Everything happens in `src/Cab.jsx`. First count the rings in a ref and send the count to the log at the end of each ride, then put the cursor in the name box for a new driver, and last make Next stop work. The check puts two cabs on one page, uses a bell of its own that writes down every ring and every line of the log, and counts how many times each cab is drawn.
