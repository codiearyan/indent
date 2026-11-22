# Notes that turn into HTML

## What you will be able to do

The search at Ashgrove Press now keeps every customer to their own orders. The next ticket is about what the portal shows. By the end of this issue you will be able to:

- explain how text a customer typed can become part of a page
- reproduce a note that the browser reads as HTML
- fix the page by writing every value as text, at the moment it goes into the HTML
- write a test that catches the fix which forgets quotes

## The ticket

Rune Kasprzak runs the presses and works from the staff board, a page that lists every open order as a card.

> **Rune:** We nearly printed Yusra's gig posters at the wrong size. The note says "Size A2" and then nothing, but Yusra swears there was more. The order page shows the same. And Cosmo's name showed up in bold on the board last week, which nobody did on purpose. AP-15.

The note Yusra typed was `Size A2 <not A3>.` The staff board showed `Size A2 .`

## The idea: a page is text the browser reads

`renderOrderCard()` builds the HTML of a card by pasting values into a template. The browser does not know which parts came from the shop and which from a customer. It reads all of it as HTML. Take a different page, a list of comments under a recipe:

```js
const html = `<li class="comment">${comment}</li>`
```

A comment like `Lovely, thanks` is shown as text. A comment like `Try <b>more</b> salt` is shown with a bold word, because `<b>` is a tag. A comment like `<not sure>` disappears, because the browser takes it for a tag it does not know. That is Yusra's missing text.

Now the harmful case. A comment can hold a tag that runs code, such as an image whose `onerror` attribute holds JavaScript. That code runs in the page of whoever looks at it. On the staff board, that is Rune or Deshawn, signed in with staff rights, so the code can do anything they can: read every order, change a status, send their session away. Nobody broke in; the page itself handed over the code.

## Quotes matter too

Values do not only go between tags. The card also puts the note inside an attribute, so the customer can edit it:

```html
<input name="note" value="${order.note}">
```

Here `<` is not the danger. A double quote is: it ends the value early, and whatever follows is read as more attributes of the input. Text like `" onfocus="...` gives the field an event handler of its own. A fix that only looks after angle brackets leaves this open.

## How to fix it: escape on the way out

HTML has a way to show any character as text: a character reference. `&lt;` shows a `<`, `&gt;` a `>`, `&quot;` a `"`, `&#39;` a `'`, and `&amp;` an `&`. Turning those five characters into their references is called escaping. The browser then shows exactly what the customer typed, and nothing in it can start a tag or end an attribute.

Two rules make it work.

First, turn `&` into `&amp;` before the others. Every reference starts with `&`, so if you do it last you change the references you just wrote, and the page shows `&lt;` instead of `<`.

Second, escape at the moment a value goes into the HTML, not when it is saved. The same note is also used in emails, in search and in the proof the press prints, and none of those want `&lt;` in them. Old notes are already in the database as they were typed. And only the place that writes HTML knows it is writing HTML. Escape every value there, including the ones you trust: it costs nothing and nobody has to remember which were safe.

Removing characters is not the fix. Yusra really meant `<not A3>`, and a customer called `Dunleavy & Daughters` should see their name as it is.

## How to reproduce it

Run the demo:

```
node src/demo.js
```

It renders order 2046 and prints what the staff board makes of it with `readCard()` from `src/staffScreen.js`. That helper reads a card the way a browser would and tells you the words in each part, the value in the note field, every tag and every event attribute. It never runs scripts, so any card is safe to read with it. In `src/reproduce.js`, make an order whose text becomes HTML and return it with its card. A card whose tags or words differ from what the customer typed is the proof you attach to AP-15.

## How to test it

Render a card and read it back with `readCard()`. Then assert what a customer would care about: each part shows exactly the words they typed, the card has no tags of their making, and the note field holds the note. Use one note with a tag in it and one with a quote in it.

## Your work in this issue

Start in `src/reproduce.js`, then fix `src/orderCard.js`, then write `src/orderCard.test.js`. Run your tests with `npx vitest run src/orderCard.test.js`. The check runs them beside the original code, a correct fix and a fix that forgets quotes, and expects fail, pass, fail.
