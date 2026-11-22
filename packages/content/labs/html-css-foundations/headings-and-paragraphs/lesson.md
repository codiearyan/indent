# Headings, paragraphs and emphasis

## What you will be able to do

The studio's page has a skeleton now, a main heading and two paragraphs. In this issue it gets real sections. You will be able to:

- give a page an outline with headings at the right levels
- split text into paragraphs the way a reader expects
- mark words as important or stressed, and say why that is not the same as bold
- break a line inside a paragraph when the line itself matters, as in an address

## The request from Kofi

Kofi teaches the classes at Kilnworth Pottery. He saw the new page and sent the rest of the text straight away.

> **Kofi:** I pasted in what goes under the welcome: the classes, the shop and how to find us. In my notes it looked fine. On the page it is one huge block, the titles are lost in the middle, and the address is all on one line.

Open `index.html`. Everything Kofi sent sits inside one `p`. You already know why it looks like that: the browser ignores the line breaks and blank lines he typed. To the browser it is one paragraph, so it shows one paragraph.

## Headings make an outline

There are six heading elements, `h1` to `h6`. Together they form the outline of a page, like the table of contents of a book. You met `h1`, the title of the page itself. Below it, `h2` names each big part, `h3` names a part inside an `h2` part, and so on.

A page for a running club might look like this:

```html
<h1>Hillside Runners</h1>
<h2>Club runs</h2>
<h3>Tuesday hills</h3>
<h3>Sunday long run</h3>
<h2>Join the club</h2>
```

Two rules keep an outline sound. A page has one `h1`. And going down, you never skip a level: an `h2` followed by an `h4` leaves a hole, as if a page of a book were missing. Going back up is fine; the next `h2` simply starts a new part.

Pick a level from where a title sits in the outline, never from how big you want it to look. Size is a job for CSS, later in this repo. People who use screen readers often jump from heading to heading to find their way, and search engines read headings to learn what a page is about, so the levels matter even when nobody sees them.

## One idea per paragraph

A paragraph holds one idea. In the running club's page, the time of a run and what to bring are two ideas, so they are two paragraphs:

```html
<h3>Sunday long run</h3>
<p>We meet at the bandstand at 8am and run for about two hours.</p>
<p>Bring water. There is nowhere to fill a bottle on the route.</p>
```

A heading is never inside a paragraph. It stands between them and names the paragraphs that follow it, until the next heading.

## Important or stressed

Some words matter more than the rest. HTML has two elements for that, and they mean different things:

- `strong` says the words are important, serious or urgent: a warning, a deadline, something nobody should miss.
- `em` says the word is stressed, the way your voice leans on it when you speak. Moving the stress changes the meaning.

```html
<p><strong>The car park closes at 6pm.</strong></p>
<p>I said the <em>Tuesday</em> run, not the Sunday one.</p>
```

Browsers show `strong` in bold and `em` in italics, and a screen reader may change its voice for them. There are also `b` and `i`, which only change the look and say nothing about meaning. When the words matter, use `strong` or `em`.

## Line breaks

Sometimes the line itself is part of the content: an address, or a short poem. Inside one paragraph, `br` starts a new line:

```html
<p>
  Hillside Runners<br />
  The Bandstand<br />
  North Park
</p>
```

`br` has no content and no closing tag, like the `meta` element in the head. Use it only where the line break means something. To get space between ideas, use separate paragraphs, not a row of `br` elements.

## Your work in this issue

Everything is in `index.html`, in the big paragraph Kofi pasted. Work in the order of the tasks:

1. Turn the three section titles into headings one level below the studio name.
2. Split the text under them into paragraphs, one idea each.
3. Mark the line about clothes as important, and stress the word Saturday in the line about the kiln.
4. Put the address on three lines inside its own paragraph.

Keep Kofi's words exactly as they are. Save after each step and watch the Browser panel: the block should turn into short sections with clear titles. Then press Check.
