# The parts of a page

## What you will be able to do

The home page has everything Dilys and Kofi asked for: headings, links, pictures and lists. What it does not have yet is a shape a machine can see. This is the last issue of the first part, and when it is done the page is complete, well-built HTML, ready for styles. You will be able to:

- explain what a landmark is and who uses it
- mark the top, the main content and the end of a page with `header`, `main` and `footer`
- group the links that move around a page in `nav`
- split the main content into `section` elements, each led by its heading

## The request from Dilys

> **Dilys:** My friend with the screen reader tried the page. She says it is much better, but every time she opens it she has to listen to the name and the links again before she gets to the classes. Her reader has a way to skip straight to the main part, but she says our page does not have one. And next week we want to start on colours, so I want the page tidy first.

Open `index.html`. Every element sits straight in the body, one after another. A person sees the top of the page, the middle and the small print at the bottom. The HTML does not say so.

## Landmarks

A landmark is a large region of a page with a clear job. Screen readers keep a list of them, so a listener can jump from one to the next or go straight to the main content. Search engines and reading modes in browsers use them too, to find the part of a page that matters.

Four elements mark the landmarks almost every page has:

- `header` is the top of the page: the name, often a logo, and the main links.
- `nav` holds a group of links that move around the site or the page.
- `main` holds the content that is the reason the page exists. There is one per page.
- `footer` is the end of the page: small print, contact details, credits.

A page for a village hall might be shaped like this:

```html
<body>
  <header>
    <h1>Marsh End Village Hall</h1>
    <nav>
      <a href="#hire">Hire the hall</a>
      <a href="#events">Events</a>
    </nav>
  </header>
  <main>
    ...
  </main>
  <footer>
    <p>Run by volunteers since 1952.</p>
  </footer>
</body>
```

`header`, `main` and `footer` sit side by side in the body. `nav` sits inside the header here, because the links are part of the top of the page. Not every group of links is a `nav`: use it for the main ways around, not for every link in a paragraph.

## Sections

Inside `main`, a `section` groups one part of the content that has its own heading. The heading comes first, and the section runs until just before the next heading at the same level:

```html
<main>
  <section>
    <h2 id="hire">Hire the hall</h2>
    <p>The main room seats eighty.</p>
  </section>
  <section>
    <h2 id="events">Events</h2>
    <p>Quiz night on the first Friday of every month.</p>
  </section>
</main>
```

Every `section` should have a heading. If a group of content has no heading of its own, it probably is not a section.

## None of this changes the look

Wrap the whole page in these elements and save: the Browser panel looks exactly the same. That is expected. These elements describe what each part is, not how it looks. That is also what makes them useful for the next part of this repo. Once the page says "this is the header" and "this is a section", CSS can give the header a colour and space the sections apart without adding anything to the HTML.

Ids keep working, too. The Jump to links still point at the ids on the headings, wherever those headings now sit.

## Your work in this issue

Everything happens in `index.html`. You are only adding elements around what is there; keep every element you already wrote.

1. Put the studio name and the Jump to links in a `header`, with the links in a `nav`. The studio picture between them is main content, so move it below the Jump to line first.
2. Wrap everything between the header and the small print in one `main`.
3. Give Classes, The shop and Visit us a `section` each, from the heading to the end of that part.
4. Put the small print at the bottom in a `footer`.

Indent what goes inside each new element, so you can see the shape of the page in the code too. Save, check that the page still looks the same and that the Jump to links still work, then press Check.
