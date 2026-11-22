# Pictures on the page

## What you will be able to do

The studio's pages are all words so far. Dilys makes things people want to see, so this issue puts pictures on the home page. You will be able to:

- show a picture with `img` and the address of its file
- write alt text that describes a picture, and know when to leave it empty
- give a picture its width and height so the page does not jump while it loads
- pair a picture with a caption using `figure` and `figcaption`

## The request from Dilys

Dilys drew the front of the studio and the mug she is proudest of this month. The drawings are in the `pictures` folder.

> **Dilys:** People walk past the studio without knowing it is there. If they see the front on the page, they will recognise it on the street. And I want the mug of the month next to its name in the shop section. Oh, and a friend of mine uses a screen reader, so please make sure she knows what is in the pictures too.

Open `index.html`. There is already one picture on it, a wavy line between the welcome and the classes, and it is missing something you will add.

## The image element

A picture is an `img` element. It has no content and no closing tag. Everything it needs goes in attributes, and the first is `src`, the address of the file:

```html
<img src="photos/bandstand.jpg" alt="The bandstand in the park on a sunny day" />
```

`src` works like the relative addresses in links: it starts from the folder the page is in. Here, the picture is in a folder called `photos` next to the page. If the address is wrong, the browser shows a small broken picture or nothing at all. That is the first thing to look for when a picture does not appear.

## Alt text

`alt` is the text that stands in for the picture. A screen reader reads it out. A browser shows it when the file fails to load. Search engines read it to learn what the picture is.

Good alt text says what the picture shows, in the words you would use to describe it to someone on the phone:

- "The bandstand in the park on a sunny day" tells the listener what is there.
- "bandstand.jpg", "image" or "photo" tell them nothing.
- There is no need to start with "A picture of". A screen reader already announces that it is an image.

Some pictures carry no information at all: a line between sections, a little flourish. For those, write `alt=""`, an empty value. That is not the same as leaving `alt` out. An empty `alt` tells a screen reader to skip the picture. With no `alt` at all, many screen readers read out the file name instead.

## Width and height

The browser learns a picture's size only once the file has arrived. Until then it does not know how much room to leave, so the text below jumps down when the picture appears. You can tell it in advance:

```html
<img src="photos/bandstand.jpg" alt="..." width="800" height="600" />
```

Write the picture's real size in pixels, as plain numbers with no unit. For an SVG file, like the drawings in this repo, the size is written on the first line of the file, in its `width` and `height`. Later in the repo you will make pictures shrink to fit a phone with CSS; these two numbers still help, because they tell the browser the picture's shape.

## Figures and captions

Sometimes a picture comes with a caption: words that belong to it and say what it is. `figure` groups the two, and `figcaption` holds the caption:

```html
<figure>
  <img src="photos/trophy.jpg" alt="A small silver cup on a wooden shelf" />
  <figcaption>The club's first trophy, won in 1987.</figcaption>
</figure>
```

The caption and the alt text do different jobs. The caption is shown to everyone and names the thing. The alt text stands in for the picture itself and describes how it looks.

## Your work in this issue

Everything happens in `index.html`, and the pictures are in the `pictures` folder beside it.

1. Show `pictures/studio.svg` just under the main heading.
2. Describe the studio picture in its alt text, and mark the wavy divider as decoration.
3. Give the studio picture its width and height, read from the first line of `pictures/studio.svg`.
4. In the shop section, turn the line about the mug of the month into a figure: the picture `pictures/mug.svg` and that line as its caption.

Save after each step and watch the pictures appear in the Browser panel. Then press Check.
