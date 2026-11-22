# Buttons that do something

## What you will be able to do

Every screen in this repo so far only shows things. Visitors can read it, but pressing anything does nothing. This part of the repo is about screens that respond, and it starts with the smallest step: running your own code when someone clicks, picks or presses. By the end of this issue you will be able to:

- give an element a function to run when an event happens
- tell handing React a function apart from calling it, and read what React prints when it goes wrong
- read what happened from the event React hands your function
- pass a handler down to a component as a prop, and call it from there

## The request from Elspeth

There is a new touch screen by the front door, the welcome kiosk. It is meant to save Elspeth from answering the same three questions all day.

> **Elspeth:** The kiosk looks lovely and does nothing. Ring for help should ring my bell at the desk. The ticket buttons should send the ticket to my printer. And I count how visitors heard about us, so when someone picks an answer, the desk needs to know which. The desk side is done: it's all in `desk.js`.

`src/desk.js` has three functions for the desk: `ringBell()`, `printTicket(kind)` and `recordAnswer(answer)`. Here each one writes a line in the Browser panel's console, so you can watch the desk at work.

## Handing React a function

In plain JavaScript you find an element and call `addEventListener`. In React you write the handler on the element itself, as a prop whose name starts with `on`, in camel case: `onClick`, `onChange`, `onKeyDown`. Its value is a function, in curly braces:

```jsx
import { soundHorn } from './depot.js'

function HornButton() {
  return <button onClick={soundHorn}>Sound the horn</button>
}
```

React keeps that function and calls it each time the button is clicked. A function written inside the component works the same way, and it can see the component's props:

```jsx
function ShedDoor({ number }) {
  function open() {
    openShedDoor(number)
  }
  return <button onClick={open}>Open door {number}</button>
}
```

Write the name in lower case, `onclick`, and nothing happens on a click. The console says ``Invalid event handler property `%s`. Did you mean `%s`?``, followed by the name you wrote and the one React expected.

## Passing, not calling

The most common mistake with events looks almost right: `onClick={soundHorn()}`. The brackets call the function at once, while the component is being drawn, and React is handed whatever it returned. The horn sounds every time the screen is drawn, and never when the button is pressed. If the function returned something that is not a function, the console adds ``Expected `%s` listener to be a function, instead got a value of `%s` type``, followed by the event's name and the type it got, and pressing the button then stops the page with the same message.

So how do you hand over a function that needs an argument? Wrap the call in a new function, written right there:

```jsx
<button onClick={() => openShedDoor(3)}>Open door 3</button>
```

The arrow function is not called while drawing. It is handed to React, and when the button is pressed, it calls `openShedDoor(3)`. Inside `map`, this is how each button gets its own value: `doors.map((n) => <button key={n} onClick={() => openShedDoor(n)}>...`.

## The event

React calls your handler with one argument: the event, an object that says what happened. Its `target` is the element the event happened on. For a field or a select, that element's `value` is what the visitor typed or picked:

```jsx
<select onChange={(event) => setRoute(event.target.value)}>
```

`onChange` on a select runs each time the choice changes. The event itself has no `value`, so `event.value` is `undefined`: the value belongs to the element. And `onChange={setRoute}` hands `setRoute` the whole event, not the route. The event only exists while the handler runs. Read it in the curly braces while drawing, as in `onChange={setRoute(event.target.value)}`, and there is no event yet: the page stops with `Cannot read properties of undefined (reading 'target')`.

## Handlers as props

A function is a value, so a component can take one as a prop, like any other. That is how a small component tells its owner that something happened, without knowing what the owner will do about it:

```jsx
function DoorButton({ number, onOpen }) {
  return <button onClick={() => onOpen(number)}>Door {number}</button>
}

<DoorButton number={3} onOpen={openShedDoor} />
```

`DoorButton` does not import anything from the depot. It calls `onOpen` with its number, and whoever draws it decides what opening means. Names that start with `on` are the custom for these props. Notice that `openShedDoor` is handed over without brackets here too: it is passed down, and only called when the button is pressed.

## Your work in this issue

Everything happens in `src/Kiosk.jsx`. Import what you need from `desk.js`, then make Ring for help ring the bell, make each ticket button print its own ticket, and tell the desk which answer a visitor picks. Last, write `TicketButton` and use it for the ticket buttons. Open the Browser panel's console and watch the desk's lines appear as you click. The check uses a desk of its own that writes down every call, with tickets and answers of its own, and presses each button more than once.
