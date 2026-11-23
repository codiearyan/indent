# Book buttons that stay grey

## What you will be able to do

The Wrenfield is a one-screen cinema on Ember Street, and you are its developer. Its website is eight years old, and five people have added styles to it, each fixing what was in front of them that day. Every ticket in this repo is a page that looks wrong for a reason the stylesheet hides. By the end of this issue you will be able to:

- explain why a rule that is plainly written in a stylesheet can do nothing at all
- list every rule that picks an element, and say which one wins and why
- mend the rule at fault instead of adding a stronger one on top
- check that your fix did not change what sat next to it

## The ticket

Kwame Darko owns the Wrenfield and picks its films. He sends you a photo of his phone with a red circle on it.

> **Kwame:** In January I added a rule to make the Book buttons orange, so people can tell them from the Trailer buttons. It is right there in the stylesheet. The buttons are still grey. Ticket WR-14.

Open the Browser panel. Every film card has two grey buttons side by side, Book and Trailer, and nothing tells them apart. Now open `styles.css` and find Kwame's rule: `.button-primary` sets an orange background. Each Book button has that class. So why does nothing happen?

## How it happens

When several rules set the same property on one element, the browser picks one. You met the order in HTML and CSS foundations: a declaration marked `!important` wins over normal ones; then the stronger selector wins; then, between equally strong selectors, the one later in the file wins.

A selector's strength counts ids first, then classes, then element names. One id beats any number of classes, wherever the rule sits in the file.

This is how a stylesheet goes wrong without anyone being careless. Years ago somebody needs the dates in a news list grey and writes:

```css
#news li span {
  color: gray;
}
```

It works, so it stays. Later someone adds a `date-today` class to make today's date red. The new rule is shorter, newer and plainly right, and it loses, because `#news li span` has an id in it. Its author sees nothing happen and blames the browser.

## See it for yourself

Look at a Book button in the Browser panel. It is grey, not orange, so some rule is winning over Kwame's. The Browser panel shows the page, not the rules behind it, so the next step is in the stylesheet.

A browser's own developer tools show the same thing in a panel: every rule that matches an element, with the losing declarations struck through.

## Find the rule that wins

Write down what the element is: a Book button is an `a` with the classes `button` and `button-primary`, inside an `article` with the class `film-card`, inside a `section` with the id `listings`.

Then go through `styles.css` from the top and, for every rule, ask: does this selector pick that element? Read a selector from right to left. `#listings .film-card a` means: an `a`, inside something with the class `film-card`, inside the element with the id `listings`. A Book button is all of that, so it matches.

For every rule that matches and sets the property you care about, here `background-color`, write down its selector and count it. Then compare:

1. Is one of them marked `!important`? It wins.
2. Otherwise, which selector is the strongest? It wins.
3. If two are equally strong, the later one wins.

The winner is the cause. It is rarely the newest rule, and almost never the one you were looking at.

## Mend the cause

The quick fixes all make the next change harder. Adding `!important` to Kwame's rule wins today, and the next rule that needs to beat it will need `!important` too. Adding the same id to Kwame's selector does the same thing with a different weapon. Deleting the old rule makes the Book button orange and takes the look away from everything else it styled.

Ask what the old rule is for. `#news li span` was written for the dates, which all have the class `date`. If it picks only what it was written for, with a selector no stronger than it needs, it stops beating rules it was never meant to fight:

```css
.date {
  color: gray;
}

.date-today {
  color: red;
}
```

Now the two selectors are equally strong, so the later one wins: today's date is red, and every other date stays grey.

After any fix, look again at everything the old rule used to pick. Those elements are the ones a careless fix breaks.

## Your work in this issue

Everything happens in `styles.css`. `index.html` stays as the ticket found it, and the checks compare it with the original.

1. Make the Book buttons orange with dark writing, from Kwame's rule.
2. Make the Become a member button readable the same way. Kwame did not mention it.
3. Keep the Trailer links, the members' terms link and the other buttons looking as they did.

Save after each change, look at the page in the Browser panel, and press Check.
