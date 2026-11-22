# Room to breathe

## What you will be able to do

The page has the studio's colours, its letters, and parts that stand out. What it does not have is space: the notes press against their edges and the sections run into each other. This is the last issue of the part about first styles, and it is about the boxes every element is drawn in. You will be able to:

- name the four layers of every box: content, padding, border and margin
- add space inside a box with `padding`, and outside it with `margin`
- draw a border on one side or all of them
- make a box's size include its padding and border with `box-sizing`

## The request from Dilys

> **Dilys:** It is nearly there. But it all feels crammed, like a shelf the night before a sale. The words in the sand notes touch the edges. Could the notes have a line down the side, like the clay stripe on our mugs? And the three parts of the page run straight into each other. Give them some air.

Open `styles.css`. Her measurements are in her notes at the top.

## Every element is a box

The browser draws every element as a rectangle, a box, even when you cannot see its edges. Each box has four layers, from the inside out:

1. the **content**: the words or the picture
2. the **padding**: space between the content and the border, filled by the box's background
3. the **border**: a line around the padding, if it has one
4. the **margin**: space outside the border, between this box and the next, always clear

A paragraph with a background shows its content and padding as one coloured shape. Its margin is outside that shape and shows the colour of whatever is behind it.

## Padding

`padding` sets the space inside a box. Here is a box for a recipe card:

```css
.recipe {
  background-color: #fff7e0;
  padding: 16px;
}
```

One value sets all four sides. Two values set top and bottom, then left and right: `padding: 8px 16px`. Each side also has its own property: `padding-top`, `padding-right`, `padding-bottom` and `padding-left`. A length always needs its unit, here `px`, except for `0`.

## Borders

A border has three parts: a width, a style and a colour. The `border` property takes all three at once, in any order:

```css
.recipe {
  border: 2px dashed #c9a227;
}
```

The style is the one that matters most: `solid`, `dashed` or `dotted`. A border without a style does not show at all, whatever its width and colour. Each side has its own property too, so `border-top: 2px solid #c9a227` draws a line along the top only. Colours here can be custom properties, like any other colour.

## Margin

`margin` sets the space outside a box, between it and its neighbours. It takes values in the same ways as padding:

```css
.recipe {
  margin-bottom: 32px;
}
```

Padding and margin can look alike when a box has no background. The difference is where the space sits: padding is inside the border and takes the background, margin is outside and stays clear. When you want two boxes further apart, use margin. When you want more room around the words inside a box, use padding.

When the bottom margin of one box meets the top margin of the next, the browser uses the larger of the two, not both added together. That is why headings and paragraphs do not end up with double gaps.

## How big is a box

When you set a width on a box, say `width: 300px`, what does the 300px measure? By default, only the content. Padding and border are added on top: with 16px of padding and a 2px border on each side, the box takes up 336px. That surprises nearly everyone, and it makes widths hard to plan.

`box-sizing: border-box` changes the sum. The width then includes the padding and the border, and the content gets what is left. A 300px box stays 300px.

`box-sizing` is not inherited, so setting it on the body changes only the body. To change every element, use the universal selector, `*`, which picks every element on the page:

```css
* {
  box-sizing: border-box;
}
```

You will often see `*, *::before, *::after` instead. The two extras pick small boxes CSS can add before and after an element's content. Neither page has any yet, so either version works here.

## Your work in this issue

Everything happens in `styles.css`.

1. Give the notes 12px of padding on every side.
2. Give the notes a 4px solid line down their left side, in clay, and no line on the other sides.
3. Give every section 48px of margin below it.
4. Make every element count its padding and border in its size.

Use the colour names from the last issue. Save after each step, look at the home page in the Browser panel, and press Check. When you are done, the first three parts of this repo are complete: well-built HTML pages with styles of their own.
