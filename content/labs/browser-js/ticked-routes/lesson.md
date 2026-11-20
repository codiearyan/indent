# Ticks that do not stick

## A report from the desk

The board is made from data now, and Marit is pleased. A week later she has a new request, and a complaint.

> **Marit:** Members want to mark the routes they have climbed. Climbers call that a tick. I added a Tick button to every route and a counter at the top. But it does not work. You tap a tick and nothing changes. Tap another one and still nothing. Reload, and the first tap does something again, I think. Nobody can tell.

Open the Browser panel and try it. Then read `src/main.js`. A click calls a function that adds the route's id to a `Set` called `ticked`, or removes it if it is already there, and then `render()` draws the whole board again from the data. That is a sound plan. Three things stand in its way.

## State first, screen second

The plan in `main.js` has a name worth knowing: the screen is drawn from state. The state is the routes and the set of ticked ids. The screen is whatever `render()` builds from them. When something happens, you change the state and draw again. You never patch one button here and one label there.

That keeps the screen honest. If the counter and the buttons are both drawn from the same set, they cannot disagree. But it only works if the drawing code actually uses the state. Right now `routeItem` is handed `isTicked` and ignores it, so every route always looks unticked.

## Saying pressed out loud

A tick button is a toggle: it is either on or off. HTML has an attribute made for that, `aria-pressed`. Screen readers announce it, so a climber using one hears "Tick, toggle button, pressed". It also gives the stylesheet something exact to hook onto. This page already colours any `.tick` button whose `aria-pressed` is `"true"`.

Attributes are strings. `setAttribute('aria-pressed', true)` happens to work because the value is turned into a string, but being explicit reads better:

```js
lamp.setAttribute('aria-pressed', String(isOn))
```

For a class that should be there only sometimes, `classList.toggle` takes a second argument that says whether to add or remove it:

```js
row.classList.toggle('selected', isSelected)
```

One more habit: give buttons `type="button"` unless they submit a form. A plain `<button>` inside a form submits it, which is a surprise you will meet in a later issue.

## Why the second click does nothing

Read `src/ticks.js`. When the page starts, it finds every `.tick` button and adds a click listener to each. The first click works. Then `render()` replaces every item on the board with a brand new one, made by `createElement`. The new buttons look the same, but they are different objects, and nobody added listeners to them. The old buttons, the ones with listeners, are gone from the page.

This is a classic bug in pages that draw from state, and the fix is not to add listeners again after every render. There is a better way.

## Events bubble

When you click an element, the click event does not stay there. After the button's own listeners run, the event travels up to the button's parent, then its parent, all the way to the document. That is called bubbling. So a single listener on a container hears clicks on everything inside it, including elements that did not exist when the listener was added.

The event tells you where it started. `event.target` is the element that was actually clicked, which might be the button or something inside it. `closest` walks up from an element and returns the first ancestor, or the element itself, that matches a selector, or `null` if none does:

```js
menu.addEventListener('click', (event) => {
  const entry = event.target.closest('.menu-entry')
  if (!entry) return
  open(entry.dataset.page)
})
```

This pattern is called event delegation. One listener, on something that stays on the page, and a question in the handler about where the click came from. The board's list is never replaced, only its children, so it is the right place to listen. And because each route item carries a `data-id`, the handler can tell which route was clicked.

## A count that cannot drift

The counter at the top should read like `3 of 12 ticked`. Work it out from the state on every render, never by adding and subtracting as clicks happen. A running total drifts the moment one click is missed. A count made fresh from the data is always right.

Count the routes that are ticked rather than the size of the set. Today those are the same number. In a later issue, the set will come from storage and may still hold the id of a route that has since been taken down.

## Try it

Fix the drawing first and watch a tick fill in. Then fix the listener and tick, untick and tick again. Finish with the counter. The check ticks routes of its own, and it also slips a new route item into the list behind your back and clicks it. Only a listener that delegates hears that one.
