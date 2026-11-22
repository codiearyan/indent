# Which rule wins

## What you will be able to do

The stylesheet has grown to several rules, and some of them pick the same elements. When two rules set the same property on one element, only one value can show. This issue is about how the browser decides, which is what the "cascading" in Cascading Style Sheets means. You will be able to:

- tell which of two equal rules wins by their order in the file
- weigh selectors against each other, and make the right one win without `!important`
- use inheritance, so a value set once reaches everything inside
- name values with custom properties and use them with `var()`

## The request from Dilys

> **Dilys:** I had a go at the stylesheet myself over the weekend. Some of it worked. But the headings would not go brown, the opening hours stayed grey when the line about clothes went clay, and the new font only reached half the page. I do not understand why, and I would like to before I break anything else.

Open `styles.css`. Her notes are in the comment at the top, and her new rules sit among the old ones. In `index.html` she also gave the Visit us section an id, `contact`, for one of them.

## When two rules disagree

When two rules set the same property on the same element with equally strong selectors, the one that comes later in the file wins:

```css
p {
  color: navy;
}

p {
  color: teal;
}
```

Every paragraph is teal. The browser reads the whole stylesheet and the last word counts. So a rule added at the top of a file can lose to an older rule further down, even though it was written last.

## How strong a selector is

When the selectors are not equally strong, the stronger one wins, wherever it is in the file. How strong a selector is, its specificity, comes from what it is made of. Count three things, from the heaviest down:

1. ids, like `#menu`
2. classes, like `.price`
3. element names, like `p` or `li`

Compare the ids first. Only when they are equal do the classes count, and only then the element names. So:

- `.price` beats `p`, because one class outweighs any number of element names.
- `#menu a` beats `.price`, because an id outweighs any number of classes.
- `#menu .price` beats `#menu a`: both have one id, then the class beats the element name.

```css
#menu p {
  color: gray;
}

.price {
  color: green;
}
```

A paragraph with the class `price` inside `#menu` stays gray, even though the green rule is later. Moving it does not help. To make a price green there, its selector needs the same id and a class: `#menu .price`.

There is a way to skip all of this: `!important` after a value makes it win over normal declarations. It is a trap. The next rule that needs to win then needs `!important` too, and soon nothing can be changed without it. Make the right rule win with its place in the file or its selector instead.

## Passed down from the element around it

Some properties pass from an element to everything inside it, unless a rule picks the inner element too. This is inheritance. The properties of text are inherited: `color`, `font-family`, `font-size`, `font-weight`, `text-align`. The properties of the box are not: `background-color`, and the spacing and borders of the next issue.

That is why the colour and font on the body reached every heading and link in the earlier issues. So a value only needs setting once:

```css
body {
  font-family: Verdana, sans-serif;
}
```

Every element is inside the body, so every element gets Verdana. Copying the font into a rule for `p, li` reaches only paragraphs and list items, and leaves anything else on the old font.

A rule that picks an element always beats what it inherits. A heading inherits the body's colour only until a rule for headings sets one.

## Names for values

The same colour code copied into five rules is easy to get wrong and hard to change. A custom property gives a value a name. Its name starts with two dashes, and it is usually set on `:root`, which picks the `html` element at the top of the page, so every element inherits it:

```css
:root {
  --leaf: #3e7d3a;
}

h3 {
  color: var(--leaf);
}
```

`var(--leaf)` is replaced by the value of `--leaf`. Change the code on `:root` and every rule that uses the name changes with it. The two dashes are part of the name, in `var()` too, and a name nobody has set gives no colour at all.

## Your work in this issue

Everything happens in `styles.css`. Read each of Dilys's rules and work out why it does what it does before you change it.

1. Make the h2 headings dark brown, while the main heading stays clay.
2. Make the opening hours clay, while the rest of Visit us stays grey.
3. Set the new font once, on the body, and remove the copies.
4. Give the five colours names on `:root`, and use the names in every rule.

None of the four needs `!important`. Save after each step, look at the home page in the Browser panel, and press Check.
