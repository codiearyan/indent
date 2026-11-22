# Lists

## What you will be able to do

Some content on the studio's page is not really a sentence at all: it is a set of things, written out with commas because Kofi typed it that way. In this issue you turn those into lists. You will be able to:

- tell when content is a list and which kind it is
- write a bulleted list with `ul` and a numbered one with `ol`
- put a list inside a list item to show groups

## The request from Kofi

Kofi added two things to the Classes section, and Dilys added a line to the shop.

> **Kofi:** New students always ask what to bring and what happens in the first class, so I wrote both down. But on the page they are long lines full of commas, and people miss the bit about the towel. Can they look like a checklist?

Open `index.html`. Under Classes there is a line about what to bring and a paragraph about a first wheel class. Under The shop there is a line about what is on the shelves. All three are lists hiding in sentences.

## Bulleted lists

When you have several things of the same kind and their order does not matter, use an unordered list, `ul`. Each thing is a list item, `li`:

```html
<p>For the picnic, bring:</p>
<ul>
  <li>a blanket</li>
  <li>something to share</li>
  <li>a jumper for later</li>
</ul>
```

The browser draws a bullet in front of each item and indents the list. Only `li` elements go directly inside a `ul`. The line that introduces the list stays a paragraph before it.

A list is more than a look. A screen reader says "list, three items" before it reads the first one, so a listener knows how much is coming and can skip it if they want. Bullets typed by hand, with a dash or a star at the start of each line, do none of that.

## Numbered lists

When the order matters, as in steps or a ranking, use an ordered list, `ol`. Its items are `li` too:

```html
<ol>
  <li>Boil the kettle.</li>
  <li>Warm the pot.</li>
  <li>Add the leaves and pour.</li>
</ol>
```

The browser numbers the items for you. If you move a step, the numbers follow. Never type the numbers yourself inside the items; you would get them twice.

To choose between the two, ask: would the meaning change if the items were shuffled? A shopping list survives shuffling, so it is `ul`. A recipe's steps do not, so they are `ol`.

## Lists inside lists

Sometimes items have items of their own: a menu with dishes under each course, a club with teams under each age group. A list can sit inside a list item to show that:

```html
<ul>
  <li>
    Starters
    <ul>
      <li>soup</li>
      <li>bread and olives</li>
    </ul>
  </li>
  <li>Puddings</li>
</ul>
```

The inner list goes inside the `li` it belongs to, after that item's own words and before its closing `</li>`. Putting it next to the `li` instead, directly in the outer list, breaks the rule that only `li` elements go directly in a list.

The browser indents the inner list and gives it a different bullet, so the groups are easy to see. You can nest a `ul` in an `ol` and the other way round, as the content needs.

## Your work in this issue

Everything happens in `index.html`. For each list, keep a short paragraph that introduces it, such as "What to bring:", and move the items into the list. Keep Kofi's words for each item.

1. Under Classes, turn what to bring into a bulleted list of four items.
2. Turn the first wheel class into a numbered list of its four steps, in the order Kofi wrote them.
3. Under The shop, turn what is on the shelves into a list of mugs, bowls and plates, with the kinds of mugs and the kinds of bowls in lists inside their items.

Save after each list and look at it in the Browser panel. Then press Check.
