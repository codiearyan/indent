# A phone layout that never arrives

## What you will be able to do

Most people who look up what is on at the Wrenfield do it on a phone, on the bus or in the queue at the bakery next door. The site has a phone layout for them, written in 2021. Somewhere along the way it stopped arriving. By the end of this issue you will be able to:

- see the phone layout, or its absence, by narrowing the Browser panel
- explain why a media query whose condition is true can still change nothing
- find the rule outside the query that wins over it, by order or by strength
- fix it without breaking the layout on wider screens

## The ticket

Bartek Sowa runs the projector. Between reels he checks the site on his phone.

> **Bartek:** On my phone the films are squeezed three in a row, and the titles wrap after every word. The stylesheet says one column on a phone, I can see it there. WR-19.

He is right on both counts. At the bottom of `styles.css` there is a block that starts with `@media (max-width: 640px)` and gives the film grid one column. The comment at the top of the file says the phone layout is for screens 640px wide and narrower. And on a phone, the films are three in a row.

## How it happens

A media query is a condition around some rules. When the condition is true, the rules inside take part in the cascade; when it is false, they are left out. That is all it does. A media query adds nothing to the strength of the rules inside it.

So when its condition is true, a rule in a media query still has to beat every other rule that sets the same property on the same element, by the usual order: `!important`, then the stronger selector, then the later rule in the file.

That gives two ways for a phone rule to lose while its condition is true:

- **By order.** A rule outside the query with an equally strong selector comes later in the file. It wins on every screen, including phones. This happens when someone moves a block of rules to the end of the file, or adds a new rule at the bottom without knowing a media query above it sets the same thing.
- **By strength.** A rule outside the query has a stronger selector. It wins wherever it sits, so moving the media query to the end does not help.

A third way is the condition itself: `min-width` where `max-width` was meant, or the wrong number, so the query is false on the phone it was written for.

Here is the first one in a recipe site:

```css
@media (max-width: 600px) {
  .steps {
    font-size: 1.25rem;
  }
}

.steps {
  font-size: 1rem;
}
```

On a phone both rules apply. They have the same selector, so the later one wins, and the steps are small on every screen.

## See it for yourself

Drag the edge of the Browser panel to make it narrow, about as wide as a phone. Watch the film cards: when the panel is narrower than 640px, the phone layout should put them in one column. If nothing changes at any width, the phone rule is losing.

The footer is worth a look at the same width. The membership and gift boxes are too: they do change, which tells you the media query itself is read.

## Find the rule that wins

Pick one element and one property: the film grid and `grid-template-columns`. Go through `styles.css` and find every rule that sets that property on that element, inside a media query or not. For each one, ask whether it applies at a phone width: a rule outside any media query always does, a rule inside one only when its condition is true there.

Then compare the ones that apply exactly as in the last issue: force, strength, order. The winner is the cause. A browser's own developer tools show the same list for an element at the window's current width, with the losing lines struck through.

## Mend the cause

Put the rules back in an order where the phone rule comes after the rule it changes, and make their selectors equally strong. The usual way to keep it that way is to keep media queries at the end of the file, or right after the rule each one changes, with the same selector.

Two quick fixes leave the cause in place. Adding `!important` to the phone rule wins today and forces everything after it. Writing a second copy of the media query lower down works too, and leaves the first one in the file, never applying, for the next person to edit and wonder about.

Last, look at the page wider than 640px. The phone layout must not reach it.

## Your work in this issue

Everything happens in `styles.css`; `index.html` stays as it is.

1. Give the film grid one column at 640px and narrower.
2. Stack the footer on a phone. Bartek did not mention it.
3. Keep the wide layout on screens wider than 640px.

Narrow and widen the Browser panel after each change, and press Check.
