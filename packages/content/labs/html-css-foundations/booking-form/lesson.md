# A booking form

## What you will be able to do

The timetable is a real table now, and people can see when the classes are. The next step is to let them book. So far every page in this repo only talks to the visitor; a form lets the visitor answer. You will be able to:

- wrap fields that are sent together in a `form`
- pick the right kind of field with the `type` of an `input`
- tie each field to its words with a `label`
- set limits on a number, and end a form with a button that sends it

## The request from Kofi

> **Kofi:** The timetable works. Now people ring to book instead of to ask. Half of them just want to put their name down. Could the page take a name, an email so I can write back, and how many places they want? Never more than four from one booking, mind.

Open `classes.html`. Under the new heading `Book a place`, Kofi wrote what he needs as plain lines: `Your name`, `Email`, `Places`, and the words for the button. Nothing on the page can be typed into yet.

## A form and its fields

A form is a group of fields that are sent together. The fields live inside a `form` element, and each one is usually an `input`. Here is a form for a bus company's lost property office:

```html
<form>
  <input type="text" name="item" />
  <input type="tel" name="phone" />
  <input type="number" name="bus" />
  <button type="submit">Report it</button>
</form>
```

`input` has no closing tag, like `img`. Two attributes matter on every field:

- `name` is what the answer is sent under. When the form is sent, the answer in the first field goes out as `item`, and the program that receives it looks for that word. A field without a name is not sent at all.
- `type` picks the kind of field. Leave it out and the field is plain text.

## Types of field

The type changes what the field accepts and how it behaves:

- `type="text"` takes any words. It is the right choice for a name.
- `type="email"` takes an email address. The browser refuses an answer with no `@` before the form is sent, and a phone shows a keyboard with `@` on it.
- `type="number"` takes a number. It gets small arrows to count up and down, and a phone shows a number pad.
- `type="tel"` takes a phone number and shows a number pad.

A number field can be given limits. `min` is the smallest value it accepts and `max` the largest:

```html
<input type="number" name="bus" min="1" max="99" />
```

The arrows stop at the limits, and the browser will not send a number outside them. It tells the visitor what is wrong in its own words.

## Labels

A field on its own is an empty box. The visitor needs words that say what goes in it, and those words have to be tied to the field, not just placed next to it. That is the job of `label`. There are two ways to tie one:

```html
<label for="item">What did you lose?</label>
<input type="text" id="item" name="item" />

<label>
  Your phone number
  <input type="tel" name="phone" />
</label>
```

In the first, the label's `for` is the same as the field's `id`. In the second, the field sits inside the label. Both work the same.

A tied label does three things. Clicking the words puts the cursor in the field, which helps anyone with a small screen or shaky hands. A screen reader reads the words when the field is reached; without a label it just says "edit text". And the browser uses the words when it says what is wrong with an answer. A paragraph next to the field looks the same, and does none of this.

## Sending the form

A form is sent by a button inside it. A `button` inside a form sends it when pressed, unless it has `type="button"`, which makes it a button that does nothing by itself. Writing `type="submit"` says the default out loud. The words between the tags are what the button shows.

When the form is sent, the browser collects every named field inside the form and sends the answers to the address in the form's `action` attribute. Kilnworth has no program on a server to receive them yet, so this form has no `action`, and the browser sends it back to the same page. When you press the button, the page loads again with the fields empty. A later repo writes the program on the other end.

## Your work in this issue

Everything happens in `classes.html`, under `Book a place`.

1. Add a form with three fields: text for the name, email for the email, number for the places, each with the name the task gives.
2. Turn Kofi's three lines into labels tied to their fields.
3. Keep the places between 1 and 4.
4. End the form with a button that has Kofi's words on it.

Keep Kofi's words as he wrote them. Wrapping each label and its field in a paragraph puts them on lines of their own. Save, try the form in the Browser panel, and press Check.
