# Choices in a form

## What you will be able to do

The booking form takes a name, an email and a number of places. Kofi needs a little more, and some answers are not typed but picked. This is the last issue of the part about tables and forms. You will be able to:

- offer a menu to pick from with `select` and `option`
- ask one question with a few answers using radio buttons in a `fieldset` with a `legend`
- ask a yes or no with a checkbox, and take longer text with `textarea`
- make answers required, so the browser checks them before the form is sent

## The request from Kofi

> **Kofi:** The bookings are coming in, thank you. But I cannot tell which class people want. I need to know if they have made pots before, so I can put beginners next to someone who has. Some ask to hear when the kiln is opened. And twice now someone pressed the button with nothing filled in at all.

Open `classes.html`. Inside the form, between the places field and the button, Kofi wrote four new lines. Each one asks something, and none of them can be answered yet.

## A menu to pick from

When the answer is one of a short, known list, a menu saves typing and spelling mistakes. A menu is a `select`, and each thing in it is an `option`. Here is part of a café's order form:

```html
<label for="size">Size</label>
<select id="size" name="size">
  <option>Small</option>
  <option>Large</option>
</select>
```

The `name` and the label work the same as on an input. The words of the picked option are what is sent; an option can also have a `value` to send something else. A menu always has an answer: the first option is picked until the visitor picks another. If you want the visitor to choose on purpose, a first option such as `<option value="">Pick a size</option>` asks them to, and its empty value means "no answer yet".

## One answer out of a few

When there are only a few answers and you want them all in view, use radio buttons. Picking one clears the others, because they share a `name`:

```html
<fieldset>
  <legend>Milk?</legend>
  <label><input type="radio" name="milk" value="none" /> No milk</label>
  <label><input type="radio" name="milk" value="oat" /> Oat</label>
  <label><input type="radio" name="milk" value="cow" /> Cow's</label>
</fieldset>
```

- Every radio button of one question has the same `name`. With different names, each is its own question and they can all be picked.
- Each has its own `value`, which is what the form sends when it is picked. Leave the value out and every one sends `on`, so the answers cannot be told apart.
- Each has its own label. Here the button sits inside its label, so clicking the words picks it.

The `fieldset` groups fields that belong to one question, and its `legend` is that question. The legend must be the first thing inside the fieldset. The browser draws a line around the group with the legend in it, and a screen reader says "Milk?" before each answer, so "Oat" makes sense on its own.

## Yes or no, and longer answers

A single yes or no is a checkbox, `<input type="checkbox" name="biscuit" />`. When it is ticked, the form sends it; when it is not, the form leaves it out.

For an answer longer than a line, use `textarea`:

```html
<label for="extra">Anything else?</label>
<textarea id="extra" name="extra"></textarea>
```

Unlike `input`, a `textarea` has a closing tag. Anything between the two tags shows inside the box when the page opens, so leave it empty. The visitor can type several lines.

## Required answers

The attribute `required` says a field must be answered before the form is sent:

```html
<input type="text" id="name" name="name" required />
```

It has no value. Like every attribute of its kind, it is on whenever it is there: `required="false"` still makes the field required, so to make a field optional, leave the attribute out. For radio buttons, `required` on one button of the group makes the whole question required.

When a visitor presses the button with a required field empty, the browser does not send the form. It moves to the first field that is wrong and shows a short message in its own words, using the label to say which field. The same check refuses an email without `@` and a number outside its `min` and `max`. This happens in the browser, before anything is sent, so it is quick and helpful, but it is not a lock. A program on a server must check the answers again.

## Your work in this issue

Everything happens inside the form in `classes.html`. Each new field goes where Kofi's line for it is now, and the old line goes.

1. Turn the class line into a menu named `class`, with a label.
2. Turn Kofi's question into three radio buttons in a fieldset, with the question as the legend.
3. Add a checkbox for the news and a `textarea` for anything Kofi should know.
4. Make the name, email, places and the experience question required.

Keep Kofi's words as he wrote them. Save, press the button with the form empty to see the browser's own messages, and press Check.
