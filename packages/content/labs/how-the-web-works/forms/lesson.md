# Sending a form

## What you will be able to do

You can send JSON, the way programs talk to each other. But most data people send on the web goes in through a form on a page: a box to type in, a file to pick, a button. A form has bodies of its own, and they are not JSON. By the end of this issue you will be able to:

- say what a form on a page sends, with `get` and with `post`
- write and send a form body, with the encoding you know from the question mark part
- send a file, in the kind of body that can carry one
- say which of the three kinds of body fits what you send

## The request from Odette

> **Odette:** At the village fete we had a stall, and people filled in song request slips and entries for the jingle competition, all on paper. The website has a form for each, and Gethin says the server only takes them the way those forms send them. He will not write another way in. Can the studio laptop send them like the website does?

The request form posts to `/forms/request`. The jingle form posts to `/forms/jingle`, and each entry is a script for a jingle, written in a text file.

## What a form on a page sends

Here is a form a library might have for joining it:

```html
<form method="post" action="/join">
  <input name="name">
  <input name="branch">
  <button>Join</button>
</form>
```

When someone types "Ina Pryce" and "North Quay" and presses the button, the browser sends:

```
POST /join HTTP/1.1
content-type: application/x-www-form-urlencoded

name=Ina+Pryce&branch=North+Quay
```

The body is written exactly like the question mark part of an address: `name=value` pairs joined with `&`, with the same codes for characters that have a job, and `+` for a space. Each `name` comes from the `name` of a box on the form. The content type has a long name, `application/x-www-form-urlencoded`, and it means just that: a form, encoded the way addresses are.

A form with `method="get"` sends the same text after a question mark in the address instead, with no body. That suits a search. A form that adds something, like this one, uses `post`.

## Sending a form from code

You already know the tool that writes this encoding: `URLSearchParams`, the same kind of object as a `URL`'s `searchParams`. It can start from an object of names and values:

```js
const form = new URLSearchParams({ name: 'Ina Pryce', branch: 'North Quay' })
form.toString() // 'name=Ina+Pryce&branch=North+Quay'

await fetch('https://library.example/join', { method: 'POST', body: form })
```

Handed a `URLSearchParams` as its body, `fetch` writes the text and adds `content-type: application/x-www-form-urlencoded;charset=UTF-8` by itself. Handed the same text as a string, it labels it `text/plain`, as with JSON, and then the `content-type` is yours to set.

## Files need another kind of body

The encoding of a form body was made for short values. A file can be large and hold anything, so a form that sends one says `enctype="multipart/form-data"`, and the browser sends a body made of parts:

```
POST /photos HTTP/1.1
content-type: multipart/form-data; boundary=----edge7f3a

------edge7f3a
Content-Disposition: form-data; name="card"

5521
------edge7f3a
Content-Disposition: form-data; name="photo"; filename="ina.jpg"
Content-Type: image/jpeg

(the bytes of the file)
------edge7f3a--
```

Each part starts with a **boundary** line and has headers of its own: the name of the box and, for a file, its file name and type. The boundary is chosen so it appears nowhere in the parts, and the `content-type` of the request says what it is, so the server can find where each part ends.

In code, a `FormData` holds the parts. A file is a `Blob`, which holds the file's contents, and its file name goes as the third value of `append`:

```js
const form = new FormData()
form.append('card', '5521')
form.append('photo', new Blob([photoBytes], { type: 'image/jpeg' }), 'ina.jpg')
await fetch('https://library.example/photos', { method: 'POST', body: form })
```

`fetch` writes the parts, picks a boundary and puts it in the `content-type`. Leave that header to it. A `content-type` of your own replaces the one with the boundary, and the server can no longer find the parts.

## Three kinds of body

- `application/json`: values for a program, any shape, as JSON text.
- `application/x-www-form-urlencoded`: a flat list of names and values, the way a simple form sends them.
- `multipart/form-data`: parts, when one of them is a file.

The server decides which kinds it reads on each path. The `content-type` tells it which one arrived.

## Your work in this issue

Open `src/forms.js`. Task 1 writes the body a request form sends. Task 2 sends it to the cupboard server. Task 3 sends a jingle entry with its script as a file.

Run `node run.js` after each task and read the bodies it prints. One slip from the fete is for Seven Bridges, which is already on the list. Check uses a server of its own, with names, values and files of its own.
