# The shop as a grid

## What you will be able to do

The header is laid out: the name on top, the links in a row that wraps. Flexbox lines things up in one direction at a time. This issue is about laying things out in two directions at once, in rows and columns, the way pots stand on a shelf. You will be able to:

- turn an element into a grid container and give it columns
- size columns with `fr`, a share of the room that is left
- write many columns at once with `repeat()`
- let the browser fit as many columns as there is room for, with `minmax()`

## The request from Dilys

> **Dilys:** This week's firing came out well, so I want the shop to look like the shelves in the window, not a list on a scrap of paper. I made each pot a little card, and the two classes too. Can the classes sit side by side, and the pots stand in rows? On a big screen I want lots per row, on a phone fewer, and never an empty strip at the end of a row.

Open `styles.css`. Her notes are at the top. The cards already have their frame from the rule for `.card`, and the two lists of cards have no bullets.

## Rows and columns

A grid lays out the children of one element, like flexbox. `display: grid` turns the parent into a **grid container**, and its children become the cells. Then `grid-template-columns` says how many columns there are and how wide each one is, as a list of sizes separated by spaces:

```css
.photos {
  display: grid;
  grid-template-columns: 300px 300px 300px;
}
```

That makes three columns, 300px each. The children fill them from left to right, and when a row is full the next child starts a new row. You do not say how many rows; there are as many as the children need.

The rule goes on the container, like `display: flex` did. `grid-template-rows` exists too, but it sets the height of rows, not the columns.

## Sharing the room with fr

Columns in px stay the same width on every screen, too wide for a phone and too narrow for a big monitor. Percentages seem the answer, `50% 50%`, but they leave no room for space between the columns, and the cells spill out.

Grid has its own unit, `fr`, a fraction of the room that is left. `1fr 1fr` makes two columns that share the room equally. `2fr 1fr` gives the first column twice the share of the second. The browser first takes away any gaps and fixed sizes, then shares out what is left, so columns in `fr` always fit.

## Gap

Space between the cells works the way it did in flexbox: `gap` on the container. One value sets the space between columns and between rows; `row-gap` and `column-gap` set them one at a time. The space only goes between cells, never around the outside of the grid.

```css
.photos {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}
```

## repeat()

Writing `1fr` many times is tiring and easy to miscount. `repeat()` writes it for you. It takes how many, a comma, then the size of each:

```css
grid-template-columns: repeat(3, 1fr);
```

This means exactly the same as `1fr 1fr 1fr`. The count can also be a word: `auto-fill` means "as many as fit". The browser divides the width of the container by the size of a column and makes that many:

```css
grid-template-columns: repeat(auto-fill, 300px);
```

On a wide screen that makes many columns, on a narrow one fewer, and the cells move into new rows by themselves. For the browser to count, it needs a size it can measure, like a length in px. `repeat(auto-fill, 1fr)` does not work, because a share of the room cannot be counted.

## minmax()

Columns of exactly 300px rarely fill the row. On a screen 1000px wide, three fit and 100px is left over, an empty strip at the end of every row.

`minmax()` gives a column a smallest and a largest size, in that order, separated by a comma. Inside `repeat()` it is how grids fill the row:

```css
grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
```

The browser counts how many columns fit at the smallest size, 300px, then lets each column grow to its share of what is left. Three columns of a bit more than 300px fill the 1000px exactly. Make the window narrower, and when three no longer fit at 300px, the browser makes two, then one.

You may also see `auto-fit` in place of `auto-fill`. They only differ when there are fewer cells than columns: `auto-fit` lets the cells stretch over the empty ones. Either works here.

## Your work in this issue

Everything happens in `styles.css`. Dilys's notes have the sizes.

1. Put the two classes side by side, in two columns of the same width.
2. Put space between the cards, in both lists.
3. Lay out the shelf as many columns as fit, written with `repeat()`.
4. Let the shelf's columns grow to fill the row.

Save after each step, look at the shop in the Browser panel, and drag the panel narrower and wider to see the shelf change. Then press Check.
