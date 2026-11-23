# A menu that opens behind the picture

## What you will be able to do

The Wrenfield's header has a Visit menu with the way to the cinema, the access details and the cafe. It is the most used link on the site, and now it opens behind the big picture of the screen. By the end of this issue you will be able to:

- explain what `position` and `z-index` do, and when `z-index` does nothing
- find the element that makes a stacking context around something that should be on top
- fix what is really being compared instead of raising a number
- keep positioned things placed against the element they were placed against

## The ticket

> **Kwame:** I click Visit and the menu opens behind the big photo of the screen. You can see the top of it, then it disappears. Someone already gave the menu a z-index of 20 and the photo only has 2. How can 2 beat 20? WR-31.

Open the Browser panel and click Visit in the header. The menu starts to open, and the picture covers it.

## How it happens

These ideas are new in this repo, so here they are from the start.

**Positioned.** An element is positioned when its `position` is `relative`, `absolute`, `fixed` or `sticky`, anything but the default `static`. `relative` keeps the element in its place and lets other boxes be placed against it. `absolute` takes the element out of the flow and places it with `top`, `right`, `bottom` and `left` against the nearest positioned element around it. `sticky` keeps an element in the flow until it reaches its `top` while scrolling, then holds it there.

**z-index.** Where boxes overlap, `z-index` says which one is painted on top: higher on top. It works on positioned elements and on the items of a flex or grid container. On anything else it does nothing. Without it, positioned elements are painted over the ones that are not, and later elements over earlier ones.

**Stacking context.** An element with a position and a z-index, or one that is `fixed` or `sticky`, makes a stacking context: a closed layer that is painted as one. A z-index inside it only orders things inside it. On the page, the whole layer takes the place of its parent's z-index.

So `z-index: 20` inside a box with `z-index: 1` is like floor 20 of a building that is one storey tall next to a building that is two. Here is the same thing in a photo gallery:

```css
.toolbar {
  position: sticky;
  top: 0;
  z-index: 1;
}

.toolbar .tooltip {
  position: absolute;
  z-index: 50;
}

.gallery {
  position: relative;
  z-index: 2;
}
```

The tooltip is inside the toolbar's layer, the toolbar's layer is 1, the gallery's is 2, and the gallery covers the tooltip whatever number the tooltip has.

One more trap: `overflow: hidden` on an element cuts off anything inside it that sticks out, a menu included, when the menu is placed against that element or something inside it.

## See it for yourself

Click Visit in the Browser panel and watch where the menu goes behind the picture. Then try a z-index of 9999 on the menu, save, and click again: nothing changes. That is the clue that the menu's own number is not the one being compared. Take the 9999 out again afterwards.

## Find the rule that wins

Start at the element that should be on top and walk up through the elements around it to the page. For each one, write down its `position` and its `z-index` from the stylesheet. The first one on the way up that makes a stacking context is the one that is compared on the page.

Then do the same for the element that covers it. Compare the two that stand for them: the higher z-index wins, and between equal ones the later in the page wins.

A browser's developer tools show each element's position and z-index too, and some draw the layers in 3D.

## Mend the cause

Change what is compared: give the layer that holds the menu a place above the one that covers it, or take away a z-index that does not need to be there, so the elements stop forming a closed layer.

Two quick fixes break something else. Removing `position` from an element takes away its stacking context, and also everything else the position did: a sticky header stops sticking, and everything that was placed against that element is placed against something further out. A bigger z-index on the menu changes nothing at all.

## Your work in this issue

Everything happens in `styles.css`; `index.html` stays as it is.

1. Make the open Visit menu sit on top of the big picture.
2. Make an open seat guide on a film card sit on top of the cards after it. Kwame did not mention it.
3. Keep the header sticky, the caption on the picture and the badges on their cards.

Save after each change, click Visit and a Seat guide in the Browser panel, and press Check.
