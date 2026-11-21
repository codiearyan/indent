# A sign-up form that works without a mouse

## Nobody can book homework club

The homework club has twelve places, and this week only three were booked online. Then a message arrives.

> **Dev, a parent:** I filled in your form on my phone and pressed the yellow button. Nothing happened. My son tried on the laptop with the keyboard, because the trackpad is broken, and he could not even get to the button.

Open the sign-up form at the bottom of `index.html`. It looks like a form, but it is a set of `div` elements with some inputs inside. The words next to the fields are loose text. The yellow button is a `div` with a background colour. There is not even a `form` element, so there is nothing to send.

## A label belongs to its field

Text that sits next to a field means nothing to the browser. A screen reader that lands on the field says "edit text, blank", and the visitor has to guess what goes in it. A placeholder does not help much either, because it disappears as soon as you start typing.

The `label` element ties words to a field. There are two ways to tie them. Either the label points at the field's `id`:

```html
<label for="town">Town</label> <input id="town" name="town" />
```

Or the label wraps the field:

```html
<label><input type="checkbox" name="gift" /> This is a gift</label>
```

Both do the same thing. A screen reader reads the label when the field gets focus. And clicking the words now puts the cursor in the field or ticks the box, which gives everyone a bigger target, especially on a phone. Each radio button needs a label of its own, because each one is a separate choice.

The `name` attribute is something else. It is the key the value is sent under when the form is submitted. Keep the names as they are: whatever receives the form later will look for them.

## The right type of field

An `input` with no type, or with `type="text"`, accepts anything. The browser can do much more when it knows what you expect.

- `type="email"` checks that the value looks like an address, and a phone shows a keyboard with the at sign on it.
- `type="tel"` brings up a number pad. It does not check the format, because phone numbers differ so much from country to country.
- `type="number"` accepts only numbers, and takes `min` and `max` for the smallest and largest value.

The `required` attribute stops the form from sending while the field is empty, and the browser shows a message next to it. It takes no value: writing the word is enough.

```html
<input type="number" name="tickets" min="1" max="4" required />
```

Leave optional fields optional. A form that demands a phone number from someone who does not want to give one loses that person.

## Group the choices

Two radio buttons that answer one question belong together. A `fieldset` groups them, and its `legend` holds the question:

```html
<fieldset>
  <legend>Delivery</legend>
  <label><input type="radio" name="delivery" value="post" /> By post</label>
  <label><input type="radio" name="delivery" value="collect" /> Collect in person</label>
</fieldset>
```

When focus moves to the first choice, a screen reader reads the legend first: "Delivery, By post, radio button, one of two". Without the group, the visitor hears "By post" and has to work out what the question was. Radio buttons with the same `name` form one group, so marking one of them `required` means a choice must be made.

A fieldset draws a border by default. If it does not fit the design, CSS can take the border and padding away.

## A real button

A `div` can look exactly like a button, but it is not one. You cannot reach it with the Tab key, Enter and Space do nothing on it, and a screen reader does not announce it as something you can press. Making a `div` behave like a button takes a lot of code, and it is easy to get wrong.

The `button` element has all of that built in. Inside a form, a button with `type="submit"`, or with no type at all, sends the form. That is also when the browser checks `required`, the email format and the number limits, so all the work you did on the fields only pays off with a real button.

```html
<form action="/order" method="post">
  ...
  <button type="submit">Place order</button>
</form>
```

The library has no booking service yet, so the form sends to the page itself. That is fine for now. What matters is that the form is a form.

## Try it

Click in the Browser panel, then use only the keyboard. Tab moves from field to field, Space ticks a box, the arrow keys move between radio buttons, and Enter sends the form. Try sending it empty and see what the browser tells you. When you can fill in and send the whole form without touching the mouse, press Check.
