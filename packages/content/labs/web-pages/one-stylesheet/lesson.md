# Forty style attributes, one stylesheet

## A colour change that took an afternoon

The library has new signs, and the trustees chose a slightly warmer cream for them. They would like the website to match.

> **Ruth, the head librarian:** It is one colour. Why did it take you all afternoon, and why are the menu links still the old cream?

Search `index.html` for `style=` and you have your answer. The volunteer styled the page element by element: forty `style` attributes, with the same colours and sizes typed again and again. Every change has to be made in every copy, and one copy is always missed. And there is a stranger problem in `styles.css`: the dates in the event cards are green only because of an `!important`.

## Why style attributes hurt

A `style` attribute applies to one element and nothing else. It cannot be shared, it cannot change with the screen size, and it sits in the middle of your content where it makes the HTML hard to read.

A rule in a stylesheet applies to every element its selector matches. Five cards that look alike need one rule, not five attributes:

```css
.recipe-card {
  border: 1px solid #c8c2b6;
  padding: 16px;
}
```

When an element needs a style of its own, give it a class and write a rule for that class. Often you do not even need a new class. A selector can describe where an element sits: `.recipe-card h3` reaches every heading inside a card, and `form button` reaches the button in the form.

Move one group of attributes at a time, save, and compare the page with how it looked before. The goal is a page that looks exactly the same, with all its styling in one place.

## Custom properties name your values

Even in one stylesheet, the same colour typed in nine places is nine places to change. Custom properties let you name a value once and use the name everywhere. They start with two dashes, and you usually put them on `:root`, which is the `html` element, so every element on the page can see them:

```css
:root {
  --bark: #4a3b2c;
  --gap: 12px;
}

.menu a {
  color: var(--bark);
  margin-right: var(--gap);
}
```

`var(--bark)` is replaced by the value wherever it appears. Now a new shade of brown is one edit. Name colours by their job when you can, such as `--text` or `--card`, because the job stays the same when the shade changes. The same works for spacing: a small set of named steps keeps the page even, and changing a step updates every gap that uses it.

Custom properties are also inherited, like the text colour. A rule lower down the page can give a name a new value, and everything inside that element uses it. You will need that in the last issue of this repo.

## Who wins when rules disagree

Often two rules set the same property on the same element. The browser picks a winner by how specific each selector is. Count three things in each selector:

1. ids, such as `#menu`
2. classes, attributes and pseudo-classes, such as `.card` or `:hover`
3. element names, such as `p`

The selector with more ids wins. If they tie, the one with more classes wins, then the one with more element names. Only when everything ties does the rule that comes later in the file win.

```css
#shop p {
  color: grey;
}

.price {
  color: green;
}
```

A paragraph with the class `price` inside `#shop` is grey. One id beats any number of classes, so the order in the file does not matter.

## The trouble with !important

`!important` jumps the queue: a declaration marked with it beats every normal declaration, however specific. It works, which is why it is tempting. But the only way to beat it later is another `!important`, and soon every rule shouts and nobody can tell which one wins.

The better fix is to make the selectors say what you mean. If a rule is more specific than it needs to be, make it less specific, for example by using a class instead of an id. Or make the rule that should win a little more specific, by naming where the element sits. Then remove the `!important` and watch the page: if nothing changes, the fight is settled.

## Try it

Start with the event cards, where the same attributes repeat five times. Keep the Browser panel next to the editor and compare after every move. The shell can help you count what is left:

```
grep -c 'style=' index.html
```

When that prints 0, name the colours, then settle the fight over the dates and press Check.
