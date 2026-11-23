# A box that sticks out on a phone

## What you will be able to do

The Wrenfield sells gift tickets, and the Gift a ticket box on the home page brings in more than any advert. On a phone it now hangs off the edge of the page. By the end of this issue you will be able to:

- add up a box's width the way the browser does, padding and border included
- explain why `width: 100%` can make a box wider than its column
- choose between `box-sizing: border-box` and no width at all
- tell a fix from a cover that only hides the part that sticks out

## The ticket

> **Bartek:** On my phone the gift box sticks out past the right edge, and when I scroll, the whole page slides sideways. The footer's email box does something similar. I gave the gift box `width: 100%` years ago so it would fill its column, it has always been like that. WR-27.

Open the Browser panel and drag it narrow. The orange border of the gift box runs past the right edge of the page. Drag it wide: on a big screen it pokes out past the right edge of its column too, it is just easier to miss.

## How it happens

You met the box model in HTML and CSS foundations: content, then padding, then border, then margin. The question is what `width` measures.

By default, `box-sizing` is `content-box`: the width is the width of the content only, and the padding and the border are added outside it. So a box with `width: 100%`, 24px of padding on each side and a 3px border on each side takes up its whole column plus 54px. It cannot fit, on any screen.

```css
.quote {
  width: 100%;
  padding: 20px;
  border: 2px solid gray;
}
```

On a recipe site, this quote box is 44px wider than the column it sits in. Nobody notices on a wide screen where the column has room around it; on a phone, the column is the screen, and the box hangs off it.

The other way a box goes wrong is a fixed width: `width: 400px` is 400px on every screen, and a phone column narrower than that cannot hold it.

Many sites set `box-sizing: border-box` on every element at the top of the stylesheet, so a width includes padding and border. The Wrenfield's stylesheet is older than that habit.

## See it for yourself

Drag the Browser panel narrow, about as wide as a phone, and look at the right edge of the gift box: its border runs out of the page. Then look at the email field in the footer: its left edge sits well inside the dark footer, and its right edge runs to the edge of the page. Two boxes, one sum.

The Browser panel cannot show you the numbers, so you add them up yourself from the stylesheet. A browser's own developer tools draw the same sum as a diagram of nested boxes.

## Find the rule that wins

For the box that sticks out, find every rule that picks it and write down four things: its `width`, its `box-sizing`, its padding left and right, and its border left and right. Look for `box-sizing` in the rules for that element and for `*` at the top of the file. If there is none, it is `content-box`.

Then add it up. With `content-box`: width plus padding plus border. With `border-box`: just the width. Compare the result with the column. If the width is a percentage, ask what 100% means: the width of the column the box sits in.

## Mend the cause

There are two honest fixes, and which one fits depends on the element.

- Make the width count the padding and border, with `box-sizing: border-box`, on the box or on every element at once. `width: 100%` then means exactly the column.
- Remove the width. A block box, like a `div` or an `aside`, fills its column by itself, padding and border included. A form field is not a block box: without a width it is only as wide as its own default size, so a field that must fill its column keeps its width.

Three quick fixes hide the box instead of fitting it. `overflow: hidden` on the column around it cuts off whatever sticks out, its border and padding with it, and will cut off the next thing that needs to stick out on purpose. A negative margin pulls the box outward and leaves it as wide as before. Removing the padding or the border makes the box fit by making it look different.

## Your work in this issue

Everything happens in `styles.css`; `index.html` stays as it is.

1. Make the gift box fit its column, and still fill it.
2. Make the email field in the footer fit its column, and still fill it.
3. Keep their padding, their borders and the layout of the page as they are.

Narrow and widen the Browser panel after each change, and press Check.
