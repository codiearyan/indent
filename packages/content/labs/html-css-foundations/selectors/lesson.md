# Picking what to style

## What you will be able to do

The pages are cream and brown, in the letters of the studio's sign. But every rule so far is for the body, so everything changes at once. Dilys now wants some parts to look different from the rest. You will be able to:

- pick every element of one kind by its name
- give one rule to several selectors at once
- pick chosen elements with a class, and one element with an id
- pick elements by where they sit, such as links inside the nav

## The request from Dilys

> **Dilys:** It looks like us now, thank you. But everything is the same brown, so nothing stands out. Could the headings be the orange of fired clay? The line about muddy clothes and the opening hours get missed, so put them on something like sand. The mug of the month should sit in the middle. And the Jump to links at the top want to be bold.

Open `styles.css`. Under the comment with her notes is the body rule from the last issue. Each of her wishes picks out different parts of the page, and picking parts is what a selector does.

## Picking elements by name

The simplest selector is the name of an element. `body` picks the body; `p` picks every paragraph on the page; `li` picks every list item. A selector made of a name is called a type selector:

```css
h3 {
  color: #2d5b8c;
}
```

This rule reaches every `h3`, wherever it is. That is what you want when every element of a kind should look the same, and too much when only some of them should.

## Grouping

When several selectors need the same declarations, list them in one rule, separated by commas:

```css
h3,
dt {
  color: #2d5b8c;
}
```

This is the same as two rules with the same colour, written once. Change the colour here and both change. Without the comma, `h3 dt` means something else, as you will see below.

## Classes

A class is a name you give to elements in the HTML, with the `class` attribute, so CSS can pick just those elements:

```html
<p class="warning">The car park closes at six.</p>
```

```css
.warning {
  background-color: #fde9a9;
}
```

In CSS, a class is picked with a dot in front of its name. Any number of elements can share a class, of any kind, and the rule reaches all of them and nothing else. The name is yours to choose; pick one that says what the thing is, like `warning`, not what it looks like, like `yellow`. The name must match exactly, capitals too.

Here is one more property for the next part: `text-align` lines up the text and pictures inside an element: `left`, `right` or `center`. CSS uses the American spelling for its words, so `centre` is not a value it knows.

## Ids

An id names one element on the page, and no other element may have the same id. You used ids for the Jump to links. CSS picks an element by its id with a `#`:

```css
#opening-times {
  text-align: center;
}
```

An id is for something there is only one of. When two or more things should look alike, use a class. Ids also weigh more than classes when rules disagree, which is the subject of the next issue.

## Picking by where an element sits

Two selectors with a space between them pick the second only when it is inside the first:

```css
footer a {
  font-weight: bold;
}
```

This picks links inside the footer, at any depth, and leaves every other link alone. It is called a descendant selector. `font-weight` sets how thick the letters are: `bold` or `normal`, or a number where `400` is normal and `700` is bold.

This is why the parts of a page from the first part of this repo matter. Because the page says which part is the nav, CSS can pick the links in it without a class on every link.

A background colour fills the box of the element it is set on. The colour, font and weight of letters also reach every element inside it, unless a rule picks that element too. The next issue explains why.

## Your work in this issue

You work in `styles.css`, and in `index.html` for the class and the id.

1. Colour the main heading and the h2 headings clay with one rule.
2. Give the two notes the class `note`, and give the class the sand background.
3. Give the mug of the month the id `mug-of-the-month`, and centre it.
4. Make the Jump to links bold with a rule that picks links inside the nav.

Dilys's codes are in her notes. Save after each step, look at the home page in the Browser panel, and press Check.
