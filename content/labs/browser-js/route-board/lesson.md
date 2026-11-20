# The board that was typed by hand

## A new job at Gritstone

Gritstone Climbing is an indoor climbing gym in an old mill. Above the front desk hangs a screen called the route board. It lists every route on the walls: its grade, the colour of its holds, and who set it. Climbers check it before they warm up.

> **Marit, the owner:** Every Monday the setters strip a wall and put up new routes. Then someone opens the HTML file and types the new routes in by hand. Half the time they forget. Right now the board shows a route we took down two weeks ago. Hollis keeps the real list in a JavaScript file. Can the board just use that?

Open the Browser panel. The page you see is `index.html`, and the four routes on it were typed into the HTML. Then open `src/routes.js`: nine routes, each a plain object with an `id`, a `name`, a `grade`, a `colour` and a `setter`. The data and the page disagree. Your job in this issue is to make the page come from the data, so they can never disagree again.

## The page is a tree of objects

When the browser reads HTML, it does not keep the text. It builds a tree of objects called the DOM, the document object model. Every tag becomes an element object, and every element has a parent and children. JavaScript in the page can read and change that tree, and the screen follows straight away.

You find elements with `document.querySelector`, which takes a CSS selector and returns the first match:

```js
const heading = document.querySelector('#board-title')
heading.textContent = 'On the walls today'
```

The page's script is a module, loaded with `<script type="module">`. Modules run after the HTML has been read, so the elements are already there when your code looks for them. Modules can also import from each other with relative paths like `./routes.js`, which is how this page is split into small files.

## Making elements

To add something new, you create an element, fill it in, and attach it to the tree. Until you attach it, it exists only in memory.

```js
const note = document.createElement('p')
note.className = 'notice'
note.textContent = 'The bouldering cave closes at nine.'
document.body.append(note)
```

Building a list from an array is the same thing in a loop. Create one item per object, then append each to the list. If the list already holds old items, clear it first, or the new ones pile up underneath. `list.replaceChildren()` with no arguments empties an element, and with arguments it empties it and adds them in one go.

Elements can also carry data of their own. An attribute that starts with `data-` is yours to use, and JavaScript reads and writes it through `dataset`:

```js
note.dataset.room = 'cave'
// the element now has data-room="cave"
```

Keep that in mind. In the next issue, the board needs to know which route a click belongs to, and a `data-id` on each item is how it will find out.

## Text, not markup

There are two ways to put words into an element. `textContent` treats the value as plain text. `innerHTML` treats it as HTML and builds elements from it.

That difference matters here. Bram named one of his routes `Jump <Start>`. Hand that name to `innerHTML` and the browser sees a tag called `start`, builds an empty element, and the climber reads only "Jump". With a name chosen by a person, the right tool is `textContent`. It shows every character exactly as typed.

The same rule protects you from worse. If text that people type ever reaches `innerHTML`, they can put real markup and scripts on your page. Using `textContent` for anything that came from data is a habit worth keeping for good.

## Classes carry meaning

A climber scanning the board wants to see at a glance whether a route is easy or hard. Grades run from `V0` upward, and the stylesheet already colours a badge by band, if the badge carries the right class.

An element can have several classes. `className` sets them all as one string, and `classList` adds or removes one at a time:

```js
note.className = 'notice notice-warning'
note.classList.add('pinned')
```

To pick the band you need the number inside the grade. A grade is a string, so take off the letter and turn the rest into a number before you compare it. Be careful with two digits: `V10` is harder than `V9`, and a comparison of strings would disagree.

## When the wall is bare

Once a season the gym resets everything at once, and for a day there are no routes at all. A blank box looks broken. The HTML has a line ready for that day with the `hidden` attribute on it. The `hidden` property of an element mirrors that attribute, so setting it to `false` shows the line and `true` hides it again.

## Try it

Write `renderBoard` in `src/board.js` and save. The Browser panel reloads, and the hand-typed routes should give way to the nine from the data. Change a route in `src/routes.js`, save again, and watch the board follow. When you press Check, the board gets routes it has never seen, including names full of angle brackets and a grade with two digits.
