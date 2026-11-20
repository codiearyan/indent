# Event cards that fit any screen

## Squashed on the bus

Most people look at the events page on their phone, often on the way to the library. The next report has a photo attached.

> **Tomasz, who runs the history walk:** On my phone the cards are three thin strips side by side. The pictures stick out of them, the reading challenge card has a word running off the edge, and the menu sits on top of the library name.

Make the Browser panel narrow and you will see all of it. The page was built on a laptop and only ever checked there. Three things cause the trouble: floats hold the header and the card footers together, every card is a fixed third of the page, and the pictures have a width in pixels.

## Tell the phone the truth

Before anything else, a phone needs one line in the head of the page:

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

Without it, a phone assumes the page was made for a desktop. It draws the page about 980 pixels wide and shrinks the whole thing to fit, so the text becomes tiny and none of your narrow-screen rules ever apply. With it, the page is as wide as the phone, and your CSS decides what happens.

## Rows with flexbox

Floats were made for one job: letting text flow around a picture, like in a newspaper. For years people also used them to put things side by side, with tricks such as `overflow: hidden` to stop the parent from collapsing. Flexbox was made for rows, and it needs no tricks.

Set `display: flex` on a container and its children line up in a row. Three more properties do most of the work:

- `justify-content` decides where the free space goes. `space-between` pushes the first item to the start and the last to the end.
- `align-items: center` lines the items up through their middles.
- `flex-wrap: wrap` lets items move to a new line when the row runs out of room, instead of squeezing or overflowing.

```css
.toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
```

`gap` puts space between the items, but never at the outer edges. Another way to push one item to the far end is to give it `margin-left: auto`, which soaks up all the free space on its left.

## A grid for the list

Flex is good at one row whose items size themselves. A set of cards that should form even columns is the job of grid. Set `display: grid` on the list, and describe the columns with `grid-template-columns`:

```css
.gallery {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}
```

`fr` means a share of the free space, so that is three equal columns. On a phone, three columns are still too many. You can change the columns inside a media query, which applies its rules only when the screen is wide enough:

```css
@media (min-width: 700px) {
  .gallery {
    grid-template-columns: 1fr 1fr;
  }
}
```

Or you can let the grid work out the number itself. `repeat(auto-fill, minmax(12rem, 1fr))` means: make as many columns as fit, each at least 12rem wide, and share out what is left. On a narrow screen only one fits, on a wide screen several do, and you never write a media query. The size you choose decides where the change happens.

Once the grid places the cards, they should not set their own width any more. A leftover `width: 31%` on a card now means 31 percent of its grid cell.

## Things that poke out

A box does not grow to fit what is inside it. If the content is wider, it overflows and sticks out of the side. Two kinds of content do that a lot.

Pictures with a fixed width are the first. A limit works better than a size:

```css
.gallery img {
  max-width: 100%;
  height: auto;
}
```

The picture is never wider than its box, and the height follows the width so the picture keeps its shape. A fixed height would stretch or squash it.

Long words are the second. A browser breaks lines only at spaces and hyphens, so a long web address or a hashtag cannot break at all. `overflow-wrap: break-word` lets the browser break such a word anywhere, but only when it would otherwise overflow. Normal words are left alone. It is inherited, so setting it on the card covers every paragraph inside.

## Try it

Drag the Browser panel narrow and wide while you work, and watch where things break. Fix the rows first, then the list, then the things that poke out. The check reads your CSS at two widths, 375 pixels like a small phone and 1280 pixels like a laptop, so look at both before you press Check.
