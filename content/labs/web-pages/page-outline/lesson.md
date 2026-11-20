# A page a screen reader can walk

## The page the volunteer left

Quillmoor Library is a small public library on Tanner's Row. Last spring a volunteer put together its "What's on" page in a single weekend, then moved away. The page works, more or less. It lists this month's events, it has a form to save a place, and it looks friendly enough.

You are the library's first developer, and the first report is already in your inbox.

> **Marguerite, who runs the Tuesday knitting circle:** I use a screen reader. On your events page it reads everything as one long paragraph. I cannot jump to the events, I cannot tell where one ends and the next begins, and the dates come out as "Sat 5 Dec" with no year.

Open `index.html`. Almost everything is a `div`. The page title is a `div` with a large font. The event titles are bold text. To your eyes the page has a clear shape. To a screen reader, which reads the HTML and not the pixels, it has none.

## Elements say what things are

HTML has two jobs. It holds the content, and it says what each piece of content is. A `div` says nothing: it is a box with no meaning. Most other elements carry meaning that browsers, screen readers and search engines all understand.

Compare these two lines:

```html
<div class="big">Opening hours</div>
<h2>Opening hours</h2>
```

With some CSS they can look the same. Only the second one tells a screen reader "a new section starts here, and this is its title". People who use screen readers rarely read a page from top to bottom. They jump: from heading to heading, from landmark to landmark, from list to list. Every element that says what it is becomes a place they can jump to.

## Landmarks

A landmark is a large region of the page with a job. Screen readers offer a list of them, so a visitor can go straight to the main content and skip the menu they have heard twenty times.

Four elements cover most pages:

- `header` for the strip at the top with the name and the menu
- `nav` for a group of links that move around the site or the page
- `main` for the content that is the reason the page exists, used once per page
- `footer` for the end of the page: addresses, opening hours, small print

A recipe site might look like this:

```html
<header>
  <p>Hob and Ladle</p>
  <nav>...</nav>
</header>
<main>...</main>
<footer>...</footer>
```

There is also `section`, for a part of the main content that has its own heading. Changing a `div` into one of these elements does not change how the page looks, because the classes and ids stay. It only changes what the page means.

## Headings make an outline

Headings go from `h1` to `h6`, and together they form the outline of the page, like a table of contents. A page has one `h1`: the title of the page itself. Below it come `h2` headings for the big parts, then `h3` for the parts inside those, and so on.

The rule that matters most is that you never skip a level on the way down. An `h2` followed by an `h4` leaves a hole, and a screen reader user wonders what they missed. Going back up is fine: after a run of `h3` headings, the next `h2` simply starts a new part.

Pick the level from the outline, never from the size. If a heading looks too big, change its size in CSS and keep its level.

## Lists and articles

When there are several things of the same kind, a list says so. A screen reader announces "list, five items" before reading the first one, so the visitor knows how much is coming and can skip it.

Each event card is also a complete thing on its own. You could cut one out, pin it on the noticeboard in the lobby, and it would still make sense. That is what `article` is for. A list of articles is a common shape for a set of cards:

```html
<ul class="recipes">
  <li>
    <article>
      <h3>Leek and potato soup</h3>
      ...
    </article>
  </li>
</ul>
```

Lists come with bullets and an indent. The stylesheet can remove them with `list-style: none` and a padding of `0`, and the list keeps its meaning.

## Dates a computer can read

"Sat 5 Dec" is fine for a person standing in December. It has no year, the abbreviations are read out letter by letter, and a calendar app has no idea what it means. The `time` element keeps the friendly text for people and adds an exact value for machines:

```html
<time datetime="2027-03-14T19:30">Sunday 14 March, half past seven</time>
```

The `datetime` attribute uses one fixed format: the year, the month and the day, joined with dashes. If you want a time too, add a capital T and the hours and minutes in 24-hour time. The text inside can say anything you like.

## Try it

Keep the Browser panel open while you work. After each change, save and check that the page still looks the same. If something shifts, a closing tag probably still says `div`. Then press Check: it reads the page the way a screen reader would, and tells you which part still has no meaning.
