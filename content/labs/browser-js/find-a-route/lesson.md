# Find a route without scrolling

## Too many routes

The board is a hit. Members tick routes on the desk screen while they wait for a friend, and Hollis has started setting more routes to keep up. That brings a new problem.

> **Hollis:** We have sixty routes up. A member asks me where Pinch Me is, and I scroll and scroll. Could we search by name? And a beginner only cares about the easy ones. I put a search box and a grade list on the page, but they do nothing.

Open `index.html`. There is a text box with the id `search` and a select with the id `grade-filter`. Its options carry the values `easy`, `mid` and `hard`, the same bands as the badges, plus an empty value for any grade. Then look at `render()` in `src/main.js`. It already asks a function called `matches` about every route and only draws the ones that pass. But `matches` says yes to everything, and nothing calls `render()` when the box changes.

## Filtering is just drawing less

You do not need a second list or a copy of the board. The routes stay as they are. The filters are part of the state, and drawing the board now means: take the routes, keep the ones that match, draw those.

```js
const open = sessions.filter((session) => session.spaces > 0)
```

Because the board is always drawn from state, everything else keeps working for free. A ticked route that is searched out of view is still in the `ticked` set, so it comes back ticked. The counter still counts every route on the wall, because it is handed all the routes, not only the ones shown.

## Input and change

Form fields fire two events you will use all the time, and they are easy to mix up.

`input` fires every time the value changes: each keystroke in a text box, each paste, each deletion. `change` fires when the person has finished changing it. For a text box that means when it loses focus, or when they press Enter. For a select, it fires as soon as an option is picked.

```js
volume.addEventListener('input', () => {
  label.textContent = `${volume.value} percent`
})
```

So a search that should narrow the list as you type listens for `input`. If it listens for `change`, nothing happens until the person clicks somewhere else, which feels broken. For the grade select, `change` is the natural event.

You read the current value of a field from its `value` property. For a select, that is the `value` of the chosen option.

## Matching the way people type

People do not type the way the data is written. A member types `pinch`, or `PINCH ME` with caps lock on, or ` pinch` with a stray space in front. A good search forgives all of that.

Two string methods do most of the work. `trim` removes spaces at both ends, and `toLowerCase` makes both sides the same case before you compare. Then `includes` asks whether one string appears anywhere in the other:

```js
'Overhang'.toLowerCase().includes('hang') // true
```

Here is a pleasant detail. Every string includes the empty string. So when the search box is empty, every name matches and the whole board comes back, without any special case.

## Two filters at once

When someone types a name and picks a band, a route has to pass both tests. Write them as two questions and combine them. An early return keeps it readable: if the name does not match, the answer is no, whatever the grade. Otherwise the grade decides.

You already wrote the rule that turns a grade into a band, for the badges. Use it again instead of writing it a second time. If two pieces of code decide the band separately, one day someone changes one of them, and the badge says hard while the filter says medium. Export the function from `board.js` and import it in `filter.js`.

## Two kinds of empty

There are now two reasons the board can be empty, and they need different words. When the wall is bare, the board says so with `#board-empty`. When the wall is full but the search matches nothing, saying "no routes on the walls" would be wrong. That is what the `#no-match` line is for.

To tell them apart you need two numbers: how many routes there are, and how many are shown. Each line is visible in exactly one situation.

## Try it

Wire the search first and type in the Browser panel. Then the grade list, then the line for no matches. The check types into the box with input events only, the way a keyboard does, so a listener on `change` will not be heard.
