# An evening theme and a focus you can see

## Two reports at once

The page now has a solid structure and a single stylesheet. Two last reports arrive on the same day.

> **Priya, a night shift nurse:** I read your page on my break at three in the morning. The bright cream is like a torch in my face. There is an Evening mode button, but pressing it does nothing.

> **Alder, who volunteers at homework club:** I use the keyboard instead of a mouse because of my wrists. On your page I press Tab and the focus vanishes. I have no idea which link I am on.

Open `theme.js`. The volunteer got halfway: the button sets `data-theme="dark"` on the `html` element, but no CSS answers it. And near the top of `styles.css` a rule takes the focus outline away from links, buttons and fields.

## A theme is a new set of values

In the last issues you named every colour with a custom property on `:root`, and every rule uses those names. That pays off now. A dark theme does not need new rules for the header, the cards and the form. It only needs the names to point at new values.

An attribute selector matches an element by its attributes. Put it on `:root`, and the rule applies only while the attribute is there:

```css
:root[data-mood='calm'] {
  --text: #e4e0d8;
  --surface: #202326;
}
```

`:root` with an attribute selector is more specific than plain `:root`, so these values win while the attribute is set. When the button removes it, the page falls back to the original values. Keep the theme rule to custom properties only. Then every rule on the page follows the theme without being touched, and anything you add later does too.

One more property is welcome there: `color-scheme: dark` tells the browser to draw its own parts, such as scrollbars and form fields, in dark colours as well.

## Dark is not just inverted

Picking dark colours is not simply swapping black and white. Pure black with pure white text is harsh. A very dark grey with a soft off-white is easier on the eyes.

Every colour needs a second look. A green that reads well on cream may vanish on charcoal. Text needs a contrast of at least 4.5 to 1 against its background to be readable for most people. The browser's developer tools show the ratio when you inspect an element's colour.

You will also find colours that do two jobs. If the same dark blue paints the header background and the links in the cards, there is no single dark value that works for both. That is the moment to split one custom property into two, each named for its job.

## The focus ring is not decoration

When you press Tab, the browser moves focus to the next link, button or field, and draws a ring around it. For anyone who uses a keyboard, that ring is the mouse pointer. Removing it with `outline: none` is like hiding the pointer.

People usually remove it because it also appears when you click a button with the mouse, and some think it looks untidy. The `:focus-visible` pseudo-class solves that. It matches only when the browser decides a ring is useful, which in practice means when focus came from the keyboard:

```css
.tab-list button:focus-visible {
  outline: 2px dashed #6a4f9e;
}
```

A good focus ring is thick enough to spot, at least 2 pixels, and has some room around it. `outline-offset` moves it away from the edge. The colour must show on every background the page has. `currentColor`, the colour of the text, is a handy choice, because text is always readable on its own background, in both themes.

## A button that says its state

The Evening mode button has one more problem. A screen reader announces "Evening mode, button", but not whether it is on. The `aria-pressed` attribute fixes that. On a button, it turns it into a toggle, and a screen reader reads "pressed" or "not pressed".

It holds the text `"true"` or `"false"`, and the script has to keep it up to date:

```js
const on = !panel.hidden
toggle.setAttribute('aria-pressed', String(on))
```

Work out the new state once, then use that one value both for the theme and for the attribute. Two separate pieces of logic can drift apart. One value cannot.

## Try it

Press Evening mode in the Browser panel and read the page in both themes. Look hard at small text and at links. Then click once inside the page and press Tab over and over, and follow the ring from the header to the form. When both themes read well and the ring is always visible, press Check.
