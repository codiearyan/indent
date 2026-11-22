# Links between pages

## What you will be able to do

The home page reads well now, but it is a dead end: nothing on it leads anywhere. Links are what make a set of pages into a website. In this issue you will be able to:

- write a link with `a` and `href`
- link to another page of the same site with a relative address
- link to one part of the same page with an `id`
- write links that start an email or a phone call

## The request from Kofi

Kofi wrote a second page with the times of his classes. It is in the workspace as `classes.html`.

> **Kofi:** People keep asking me when the classes are. It is all on my new page, but nobody can get to it from the home page, and once they are on it there is no way back. And when someone wants to ring us from their phone, they have to copy the number by hand.

Open both files. Each one is a complete page on its own, with no way to get from one to the other.

## The anchor element

A link is an `a` element. Its `href` attribute is the address it goes to, and the text between the tags is what the visitor clicks:

```html
<p>Read the <a href="https://example.com/rules.html">club rules</a> first.</p>
```

The words of a link matter. Many visitors, and many screen reader users, skim a page by its links alone. "Click here" tells them nothing. "Club rules" tells them exactly where they will land. Wrap the words that name the place, not the word "here".

## Addresses: full and relative

The address above is a full one: a scheme (`https://`), a site and the page on that site. You need it to reach another website.

To reach another page of your own site, a relative address is shorter and keeps working when the site moves. It says where the page is starting from the page you are on. When both files sit in the same folder, it is just the file name:

```html
<a href="fixtures.html">This season's fixtures</a>
```

If the file were in a folder called `teams`, the address would be `teams/fixtures.html`. The browser works out the rest from the address of the current page.

## Jumping within a page

A link can also point at one part of the same page. First give that part a name with the `id` attribute. An `id` can go on any element, and no two elements on a page may share one:

```html
<h2 id="fees">Membership fees</h2>
```

Then link to it with `#` and the id:

```html
<a href="#fees">Fees</a>
```

Clicking it scrolls the page straight to that heading. The address bar ends in `#fees`, so the link can even be shared. Ids are lowercase words with no spaces, joined by hyphens if they need more than one: `opening-hours`.

## Email and phone links

The part before the colon in an address is its scheme, and `https` is not the only one. Two more are handy on every contact page:

```html
<a href="mailto:secretary@example.com">secretary@example.com</a>
<a href="tel:+15550123">555 0123</a>
```

A `mailto:` link opens a new email to that address. A `tel:` link offers to call the number, which on a phone means one tap. In a `tel:` address, write the number with no spaces. The `+` and the country code make it work from anywhere; a number in the UK, for example, drops its first `0` after `+44`. The text of the link can show the number however people are used to reading it.

## Your work in this issue

There are two files this time, and the Browser panel shows `index.html`. Follow the links you make to move between the pages.

1. In `index.html`, link the words "classes page" to `classes.html`.
2. In `classes.html`, make "Back to Kilnworth Pottery" a link to `index.html`.
3. In `index.html`, give the three section headings the ids `classes`, `shop` and `visit`, and turn the words after "Jump to" into links to them.
4. Under Visit us, make the email address and the phone number links.

Save, click each link in the Browser panel to see where it goes, and press Check.
