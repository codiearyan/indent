# A row of links

## What you will be able to do

The page has its words, its colours and room to breathe. Every element still sits under the one before it, though, top to bottom, the way the browser lays out a page when nobody tells it otherwise. This is the first issue of the last part of the repo, about layout: where boxes sit next to each other. You will be able to:

- turn an element into a flex container, so its children line up in a row
- change the direction of that row, and put space between its items with `gap`
- line the items up along the row and across it
- let a row wrap onto a new line when the screen is too narrow

## The request from Kofi

> **Kofi:** People keep asking me where the classes are, and the answer is right at the top. The jump links were hidden in a sentence, so I turned them into a list and added one for booking. Now they stack down the left like a shopping list. Can they sit side by side under the name, in the middle, like the sign over our door? And it has to work on my phone, where the window is narrow.

Open `styles.css`. Kofi's notes are at the top, and a rule for `.links` at the bottom already takes off the bullets (`list-style: none`) and the room the browser keeps for them on the left.

## Containers and items

Flexbox lays out the children of one element. You switch it on with `display: flex` on the parent, which becomes a **flex container**. Its children become **flex items**, and they line up in a row.

Here is a row of tags on a recipe card:

```html
<ul class="tags">
  <li>Quick</li>
  <li>Vegetarian</li>
  <li>Freezes well</li>
</ul>
```

```css
.tags {
  display: flex;
}
```

The rule goes on the `ul`, not on each `li`. A flex container works on its own children only, one level down. If you put `display: flex` on an element further out, its one child is the item that moves, and what is inside that child stays as it was.

## Direction and gap

A flex container has a direction, set with `flex-direction`. The default is `row`: items run from left to right. `column` runs them from top to bottom instead. The two `-reverse` values, `row-reverse` and `column-reverse`, run them the other way.

The direction decides two things: which way is **along** (the way items run) and which way is **across** (the other way). In a row, along is left to right and across is top to bottom. In a column, it is the other way round.

Space between items has its own property, `gap`, set once on the container:

```css
.tags {
  display: flex;
  gap: 8px;
}
```

You could give each item a margin instead, but then the last item gets one too, and the space lands on its outside edge. `gap` only puts space between items, never around them. One value sets the space along the row and between rows; `row-gap` and `column-gap` set them one at a time.

## Lining items up

Two properties line up the items, both set on the container:

- `justify-content` lines them up **along** the direction: `flex-start` (the default), `center`, `flex-end`, or `space-between` to push the first and last to the ends.
- `align-items` lines them up **across** the direction: `stretch` (the default), `flex-start`, `center` or `flex-end`.

For a row of tags, `justify-content: center` moves the whole row into the middle of the card. For a column, the same property moves the items up and down, because along is now top to bottom. To centre a column from side to side, you need the property for across.

These are spelt the American way, `center`, with no exception. And they move boxes, not words: `text-align` still centres the words inside each box, but it does not move the boxes of a flex container.

## Wrapping

By default a flex container keeps every item on one line, even when they do not fit. On a narrow phone, the tags would squeeze and spill out of the card. `flex-wrap: wrap` lets the items move onto a new line when the next one has no room:

```css
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
```

Each new line is lined up by `justify-content` on its own, so centred items stay centred on every line. The space between lines comes from `gap` too.

You may see `flex-flow: row wrap`, which sets the direction and the wrapping in one go. It means the same as the two lines.

## Your work in this issue

Everything happens in `styles.css`. Kofi's notes say what he wants.

1. Put the links in a row.
2. Space the links apart, between rows too when they wrap.
3. Put the name above the links, both in the middle of the header.
4. Let the links wrap on a narrow screen, with each line in the middle.

Save after each step and look at the Browser panel. To see the wrapping, drag the panel narrower. Then press Check.
