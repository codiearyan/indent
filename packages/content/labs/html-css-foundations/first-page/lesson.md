# A page from a text file

## What you will be able to do

This is the very start. You need no experience at all: every page on the web is a plain text file, and in this issue you write your first one by hand. When you are done you will be able to:

- explain what a tag and an element are
- write the skeleton every page starts with
- give a page a title for its browser tab
- put words on the page as a heading and paragraphs

## The request from Dilys

Kilnworth Pottery is a small studio at 14 Saddler Street. Dilys runs it: she throws mugs and bowls on the wheel at the back and sells them at the front. Kofi teaches the evening classes. The studio has never had a web page, and you are its first developer.

> **Dilys:** I typed what I want people to read and saved it as `index.html`, like someone told me to. But the browser shows it all on one line, and the tab just says "index.html". Can you turn it into a real page?

Open `index.html` and look at the Browser panel beside it. The words are there, but they run together in one line. A browser does not care about the line breaks you type. It only follows instructions written in HTML, and this file has none yet.

## Tags and elements

HTML marks up text: you wrap each piece of it in tags that say what the piece is. A tag is a name between angle brackets. Most come in pairs, an opening tag and a closing tag with a slash:

```html
<p>The fair starts at noon.</p>
```

The opening tag, the text and the closing tag together are an element. This one is a paragraph. Elements can sit inside other elements, like boxes in boxes, and each one must close inside the one that holds it:

```html
<p>Bring a <em>chair</em>.</p>
```

Some elements have nothing inside them, so they have no closing tag. You will meet one in the head.

An opening tag can also carry attributes: extra settings written as `name="value"` after the tag's name. You will write your first one in a moment.

## The skeleton of every page

Every page starts the same way. Here is the skeleton of a page for a street fair:

```html
<!doctype html>
<html lang="en">
  <head>
    ...
  </head>
  <body>
    ...
  </body>
</html>
```

- `<!doctype html>` comes first, above everything else; only a comment may sit over it. It tells the browser this is a modern HTML page. It is not an element and has no closing tag.
- `html` wraps everything else. It is the root of the page. Its `lang` attribute says which language the page is in, so a screen reader picks the right voice and a browser can offer to translate. `en` means English.
- `head` holds facts about the page that are not shown on it.
- `body` holds everything people see.

The indents are only there for you. The browser ignores them, but they make it easy to see what sits inside what.

## What goes in the head

Two things belong in every head:

```html
<head>
  <meta charset="utf-8" />
  <title>Summer fair on Linden Road</title>
</head>
```

`meta` with `charset` tells the browser how the letters in the file are stored. With `utf-8`, accents, symbols and every alphabet come out right. It has no content, so it has no closing tag. The slash before `>` is optional; it just reminds you that nothing follows.

`title` is the text on the browser tab, in bookmarks and in search results. It is often the same as the page's main heading, but it is not shown on the page itself. Here, the Browser panel shows it at the top, beside the file name.

## Headings and paragraphs

Inside the body, `h1` is the main heading of the page, the one big title. A page has one. Each paragraph of text goes in its own `p`:

```html
<body>
  <h1>Summer fair on Linden Road</h1>
  <p>Stalls, music and a cake contest, all afternoon.</p>
  <p>Everyone is welcome. Entry is free.</p>
</body>
```

The browser puts space between paragraphs and shows the heading large and bold. That look comes from the browser's own defaults. Later in this repo you will change it with CSS.

One more thing you will see in every file of this repo: a comment. Anything between `<!--` and `-->` is a note for people reading the code. The browser skips it. The comment at the top of `index.html` lists your tasks.

## Your work in this issue

Everything happens in `index.html`. Work through the tasks in order: first the doctype and the `html` element, then the head, then the body with its heading and paragraphs. Keep Dilys's words exactly as she wrote them.

Save after each change and watch the Browser panel: it reloads every time you save. When the top of the Browser panel shows the studio's name and the words sit on their own lines, press Check.
