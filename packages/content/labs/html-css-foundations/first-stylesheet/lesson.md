# A stylesheet of its own

## What you will be able to do

Both pages hold all of the studio's content in well-built HTML, and they still look like a plain document: black on white, in the browser's default letters. This is the first issue of a new part of the repo, about styles. From here on, HTML says what each part is and CSS says how it looks. You will be able to:

- link a stylesheet to a page
- read and write a CSS rule: a selector, then properties and their values
- set colours with codes
- pick a font with a fallback, and a text size

## The request from Dilys

> **Dilys:** The page has everything now, but it does not feel like us. When you walk into the studio, the walls are cream, the clay is dark brown, and the sign over the door is in an old serif letter. Could the page feel like that? And a bit bigger, please. Half my customers read it without their glasses.

There is a new file next to the pages, `styles.css`. Dilys put her notes in it, inside a comment, so nothing in it does anything yet. Neither page uses it.

## Where CSS lives

CSS can sit in three places: in a `style` attribute on one element, in a `style` element inside the page, or in a file of its own. This repo puts every rule in one file, `styles.css`, for a simple reason: both pages can use the same file, so a colour changed once changes everywhere.

A page loads a stylesheet with a `link` in its head:

```html
<head>
  <meta charset="utf-8" />
  <title>Fernhill Garden Centre</title>
  <link rel="stylesheet" href="styles.css" />
</head>
```

- `rel="stylesheet"` says what the linked file is for. Without it the browser does not use the file for styles.
- `href` is the address of the file, worked out from where the page is, like the `href` of a link or the `src` of a picture. `styles.css` means the file next to the page. A wrong name, even `style.css`, loads nothing, and the browser says nothing about it.

Like `meta`, `link` has no closing tag.

## A rule

A stylesheet is a list of rules. Each rule says which elements it styles, and how:

```css
body {
  background-color: #eef5e9;
  color: #20331b;
}
```

- `body` is the selector. It picks the elements the rule styles; here, the body of the page.
- Between the curly braces are the declarations. Each one is a property, a colon, a value and a semicolon.
- `background-color` is the property for the colour behind an element, and `color` is the property for the colour of its text.

Spelling matters. If a property name is misspelt, or a value is one the property does not take, the browser skips that one declaration and carries on with the next, without a word. When a change does not show, look for a typo first.

Text between `/*` and `*/` is a comment. The browser ignores it.

## Colours

A colour can be written in a few ways:

- a name: `white`, `navy`, `tomato`. There are about 140 named colours. They are handy, but few of them are the colour you have in mind.
- a code: `#eef5e9`. After the `#` come three pairs of characters, for the red, green and blue in the colour, each from `00` (none) to `ff` (all). Without the `#`, the browser does not read it as a colour.
- `rgb(238, 245, 233)` says the same three amounts as numbers from 0 to 255.

Upper and lower case letters in a code are the same colour. When someone gives you their colours as codes, use the codes: that is the exact colour they picked.

## Fonts and sizes

`font-family` names the font. Not every computer has every font, so it takes a list, separated by commas. The browser uses the first one it has:

```css
body {
  font-family: Verdana, sans-serif;
  font-size: 17px;
}
```

The last name in the list should be a general family that every computer has. `serif` is a font with small strokes at the ends of the letters, like most printed books. `sans-serif` is one without them. A font name with spaces goes in quotes: `"Times New Roman"`.

`font-size` sets the size of the text. `px` is a unit, about the size of one dot on a screen at normal zoom, and browsers start text at 16px. A size always needs its unit: `17px` works, `17` on its own is skipped. A later issue in this repo shows other units.

Setting the colour and the font on the `body` changes all the text on the page, headings and links included. Why that happens is the subject of a later issue.

## Your work in this issue

1. Link `styles.css` from the head of `index.html` and of `classes.html`.
2. In `styles.css`, write a rule for the body with Dilys's background colour and text colour.
3. In the same rule, set her font with `serif` to fall back on, and her text size in px.

The Browser panel shows the home page. Save after each step and watch it change, then press Check. Open the classes page too, from its link, to see one stylesheet change both.
