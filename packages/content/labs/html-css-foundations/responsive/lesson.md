# A page that works on a phone

## What you will be able to do

The links wrap and the shelf fits as many pots as there is room for. But most people who find a pottery studio find it on a phone, standing in the street. This is the last issue of the repo, and it makes the page read well on any screen, from a big monitor down to a phone. You will be able to:

- tell a phone that the page is made for its screen, with the viewport line
- let pictures shrink with the page without losing their shape
- size things in `rem`, which follows the reader's own text size, and limit a width with `max-width`
- change the layout below a width you choose, with a media query

## The request from Kofi

> **Kofi:** I opened the page on my phone at the bus stop and it was a tiny copy of the big one. I had to pinch to read anything, and when I zoomed in, the studio picture ran off the side. Last week I set the content to 960px wide so the lines do not run across a whole monitor, and I think that made it worse. On a phone the two class cards are squeezed side by side too.

Open `styles.css`. Kofi's notes are at the top, and his 960px rule for `main` is under the body rule. Its `margin: 0 auto` gives `main` no margin above and below and shares the room left and right equally, which keeps the content in the middle of a wide screen.

## The viewport line

When phones arrived, every page was built for a wide screen. So a phone pretends to be about 980px wide, lays the page out at that width, then shrinks it to fit. That is the tiny copy Kofi saw.

One line in the `head` tells the phone this page is ready for its real width:

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

`width=device-width` says lay the page out at the width of the device. `initial-scale=1` says open it at its normal size, not zoomed. The two parts are separated by a comma. Every page of a site needs the line, because each page has its own `head`.

## Pictures that shrink

A picture shows at its own size unless told otherwise, so a picture 640px wide runs off a screen 375px wide. `max-width` sets the largest width a box may have; it may be narrower, never wider:

```css
img {
  max-width: 100%;
  height: auto;
}
```

`100%` means the width of the box the picture sits in. A big picture shrinks to fit, and a small one keeps its own size. `width: 100%` would stretch every picture, the small ones too.

If the HTML gives a picture a `height`, that height stays when the width shrinks, and the picture is squashed. `height: auto` lets the height follow the width, so the picture keeps its shape. Keep the `width` and `height` in the HTML: they let the browser keep room for the picture before it loads.

## Relative units

A length in `px` is the same on every screen and for every reader. Many people set their phone or browser to larger text, and text in `px` ignores them.

`rem` is measured against the text size of the page's root, the `html` element, which follows that setting. With nobody changing it, `1rem` is 16px, so `2rem` is 32px and `0.5rem` is 8px. A reader who picks larger text gets every `rem` larger with it. To turn a size in px into rem, divide it by 16.

`em` is measured against the text size of the element's parent instead. On the `body`, whose parent is `html`, the two are the same. Deeper in the page they differ, so `rem` is the safer choice for widths.

`rem` works for widths too. A cycling club might keep its articles readable like this:

```css
article {
  max-width: 40rem;
}
```

The article is never wider than 40rem, but on a phone it is as narrow as the screen. `width: 40rem` would keep it 40rem wide, phone or not, and the page would run off the edge.

## Media queries

Some layouts only work above a certain width. A media query wraps rules that apply only when its condition is true:

```css
.results {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
}

@media (max-width: 500px) {
  .results {
    grid-template-columns: 1fr;
  }
}
```

`max-width: 500px` means a screen 500px wide or narrower. `min-width` means that wide or wider. The condition goes in round brackets, and its width needs a unit. The width where the layout changes is called a breakpoint.

A media query adds no weight to the rules inside it. When two rules with the same selector set the same property, the later one wins, so the media query goes after the rule it changes.

## Your work in this issue

1. In `index.html` and `classes.html`, add the viewport line to the head.
2. In `styles.css`, let every picture shrink with its box and keep its shape.
3. Set the body's text size in rem, the same size it is now.
4. Let `main` shrink on a narrow screen, still no wider than 960px, in rem.
5. At Kofi's breakpoint and narrower, put the two class cards in one column.

Save after each step, drag the Browser panel narrower to see the page as a phone would, and press Check. When you are done, the studio has a page you built from a text file, on every screen.
