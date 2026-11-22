# A first component

## What you will be able to do

Coalbrook Tram Museum is run by volunteers in an old tram depot. A few screens around the building tell visitors what is on: the welcome in the entrance hall, the ride board, the trams in the shed, the gift shop. Each one is a page of HTML that Elspeth, who runs the front desk, edits by hand every morning. You know HTML, CSS and JavaScript, and you are going to rebuild those screens with React. By the end of this issue you will be able to:

- write a component: a function that returns markup
- put a component on the page with `createRoot`
- use one component inside another, as a tag
- return more than one element with a fragment

## The request from Elspeth

> **Elspeth:** The welcome screen is the first thing people see. It is the museum's name, our opening hours and two lines at the bottom. Wilf says React lets us build a screen out of parts we can reuse. Can you start with this one?

Open the Browser panel. It is empty: the page loads a script, but nothing draws anything yet.

## A component is a function that returns markup

A React component is a JavaScript function. Its name starts with a capital letter, and it returns what should appear on the screen, written in JSX:

```jsx
export function TicketDesk() {
  return (
    <div className="desk">
      <h2>Tickets</h2>
      <p>Pay at the desk by the door.</p>
    </div>
  )
}
```

JSX looks like HTML, with a few differences that come from it being JavaScript. The class of an element is written `className`, because `class` is a word JavaScript keeps for itself; the same goes for `htmlFor` instead of `for` on a label. Every element must be closed, so an image is `<img />` and a line break `<br />`. The round brackets after `return` only let the markup start on the next line.

`export` in front of the function lets another file import it, the same as any JavaScript function.

## What JSX turns into

A browser cannot run JSX. Before the page loads, a tool called a bundler turns every tag into a function call. `<h2>Tickets</h2>` becomes something like `jsx('h2', { children: 'Tickets' })`, and that call returns a small object that describes the element: its type and its props. So a component returns a description of what it wants on the screen, and React compares that description with the page and makes the changes. That is why the bundler is the first to complain about a mistake in your JSX: if it cannot read the file, the page does not load at all.

## Putting it on the screen

React needs one element of the page to draw into. In `index.html` that is `<div id="root"></div>`. In the script the page loads, you make a root on that element and render a component into it:

```jsx
import { createRoot } from 'react-dom/client'
import { TicketDesk } from './TicketDesk.jsx'

createRoot(document.getElementById('root')).render(<TicketDesk />)
```

Note `<TicketDesk />`: you hand React an element written as a tag, not the function itself. Pass the bare function and React prints `Functions are not valid as a React child` in the console and draws nothing.

## Components inside components

Once a component exists, you use it like a tag in another component's JSX:

```jsx
export function Hall() {
  return (
    <main>
      <h1>Main hall</h1>
      <TicketDesk />
    </main>
  )
}
```

The capital letter matters. JSX treats `<ticketDesk />` as an HTML element called ticketdesk, draws an empty unknown tag, and warns in the console: `The tag <%s> is unrecognized in this browser`, followed by the name. React's warnings in the Browser panel's console show their `%s` placeholders with the values after them.

## One element comes back

A function returns one value, so a component returns one element. Two elements side by side do not make one value:

```jsx
return (
  <p>Tickets</p>
  <p>Pay at the desk</p>
)
```

The bundler stops on this, and its message does not say "two elements". It reads something like `Expected ")" but found "at"` or `Unterminated regular expression`, with the file and the line of the second element. When you see a message like that, look for elements side by side.

Wrapping them in a `div` works, but adds an element to the page that nobody asked for. A fragment groups elements without adding anything: `<>` and `</>`.

```jsx
return (
  <>
    <p>Tickets</p>
    <p>Pay at the desk</p>
  </>
)
```

Returning an array, `[<p>…</p>, <p>…</p>]`, also draws both, but React treats an array as a list and warns that each item needs a key. Lists come in a later issue.

## Your work in this issue

Start in `src/main.jsx` and put `App` on the screen. Then work in `src/App.jsx`: write `OpeningHours`, show it in `App`, then write `FooterLines` and show it in the footer. Keep the Browser panel open; it reloads every time you save, and its console shows React's warnings. When the screen looks right, press Check.
