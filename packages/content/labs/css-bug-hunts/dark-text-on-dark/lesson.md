# Dark writing on the dark box

## What you will be able to do

The late show is the Wrenfield's Friday night film, with the bar open until the credits end. Lior Ben-Ami runs it, and last month gave it a dark box on the home page so it stands out. By the end of this issue you will be able to:

- follow a colour from an element up through the elements around it to the rule that set it
- explain the difference between inheriting a custom property and inheriting a colour
- tell when a `var()` is worked out, and with which value
- fix a dark section so everything inside it follows its own colours

## The ticket

> **Lior:** I made the late show box dark and set its ink to the light cream, the same way the colours work everywhere else. The heading came out light. The rest of the writing is still black on almost black, you have to tilt your phone to read it. WR-23.

Open the Browser panel and scroll to the late show box. The heading is cream. The paragraph and the two lines of the list are dark on dark. In `styles.css`, Lior's `.late-show` rule sets `--ink` to the light cream and the background to `--night`.

## How it happens

Two things are inherited here, and they are inherited differently.

A custom property such as `--ink` is inherited as it is. Set it on an element and every element inside sees the new value, unless something inside sets it again.

A `var()` is worked out on the element whose rule uses it, at that element, with the value of the custom property there. The result is a finished value, like a colour. What the elements inside inherit is that finished colour, not the `var()` it came from.

Here is the same thing on a weather site:

```css
:root {
  --text: black;
}

body {
  color: var(--text);
}

.storm-warning {
  --text: white;
  background-color: darkred;
}
```

`body` works out `var(--text)` with the value it sees, black, so the body's colour is black. A paragraph in the storm warning has no colour rule of its own, so it inherits a colour from the warning box, which inherits black from the body. The `--text: white` on the warning box is there, and nothing inside the box ever uses it, because no rule works out a colour on the box or inside it.

A heading in the box behaves differently when there is a rule for headings with `color: var(--text)`. That rule is worked out on the heading itself, inside the box, where `--text` is white. That is why the late show heading is light and the paragraph is not.

## See it for yourself

In the Browser panel, the late show heading is light and the paragraph under it is dark. That difference is the clue: two elements in the same box, with the same `--ink` around them, get different colours. One of them must be working its colour out somewhere else.

## Find the rule that wins

Start at the dark element, the paragraph, and look for a rule that picks it and sets `color`. If there is one, that is the cause. If there is none, the paragraph inherits, so move one step out to the element around it, the late show box, and ask the same question. Keep going outwards until you reach a rule that sets `color`.

When you find it, look at its value. If it is a `var()`, it is worked out right there, on that element, with the custom property as it is there. Ask which value of `--ink` that element sees.

A browser's developer tools show the same chain for any element: the rules that apply to it, then the inherited ones from each element around it.

## Mend the cause

The colour has to be worked out on an element that sees the box's own `--ink`. The box itself is the natural place: one `color` set from `--ink` on the dark box, and everything inside inherits the finished light colour.

Two quick fixes look right today. Writing the cream colour itself into the box, or into rules for its paragraphs and list items, makes the writing light, and stops it following `--ink`: the next time the box's colours change, the writing stays behind. A rule that gives every element in the page `color: var(--ink)` works too, and breaks every place where a colour was meant to be inherited, such as a bold line inside a notice that should share the notice's colour.

## Your work in this issue

Everything happens in `styles.css`; `index.html` stays as it is.

1. Make the writing in the late show box light, from the box's own `--ink`.
2. Do the same in the footer, which is dark too. Lior did not mention it.
3. Keep every other colour on the page as it was.

Save after each change, look at the page in the Browser panel, and press Check.
