# Forms that keep what you type

## What you will be able to do

You can keep values in state, objects and lists included, and change them from events. Forms put all of that together: each field has a value, the visitor changes it by typing, and sending the form does something with what was typed. By the end of this issue you will be able to:

- make a field whose value lives in state, and read what React prints when that goes wrong
- handle several fields without writing everything three times
- send a form without the page reloading, and empty it afterwards
- show what is wrong while the visitor types, before anything is sent

## The request from Elspeth

By the exit there used to be a paper visitor book. It got left out in the rain, so now it is a screen.

> **Elspeth:** People love writing in the book, but the screen version only lets you type and nothing happens. I'd like them to see their entry as they write it, then press Sign and find it at the top of the book. And please stop the essays: one man wrote four hundred words about tram brakes. There's a limit in `book.js`.

Open `src/Guestbook.jsx`. The form is there, the preview below it is empty, and Sign does nothing you can see.

## A field whose value lives in state

Left alone, a field keeps its own value: the browser stores what is typed, and React does not know it. To show what is typed elsewhere, or to empty the field later, the value has to live in state. Give the field its value from state, and change the state on every keystroke:

```jsx
const [tram, setTram] = useState('')

<input value={tram} onChange={(event) => setTram(event.target.value)} />
```

Now the field always shows `tram`. Each key the visitor presses fires `onChange` (in React it runs on every change, not when the field loses focus), the handler sets the state, React draws again, and the field shows the new value. A field like this is called controlled.

Two things go wrong here, and React says so in the console. A `value` with no `onChange` makes a field nobody can type in, because React keeps putting the state back: ``You provided a `value` prop to a form field without an `onChange` handler``. And a value that starts as `undefined`, then becomes text, switches the field from keeping its own value to taking React's: `A component is changing an uncontrolled input to be controlled`. Start text fields at `''`, never at nothing. A `<textarea>` works the same way in React: its text goes in `value`, not between its tags.

## Several fields

Three fields can be three pieces of state, each with its own handler. Or they can be one object, with a handler that uses each field's `name` to know which property to change:

```jsx
const [fault, setFault] = useState({ tram: '', what: '' })

function change(event) {
  setFault({ ...fault, [event.target.name]: event.target.value })
}

<input name="tram" value={fault.tram} onChange={change} />
<textarea name="what" value={fault.what} onChange={change} />
```

The square brackets use the value of `event.target.name` as the property's name. The spread keeps the other fields, as you did with the till's options. Either way is right; pick the one you find easier to read.

## Sending without a reload

A form has its own way to be sent: pressing its submit button, or pressing Enter in one of its fields. Both fire the form's `submit` event, so handle `onSubmit` on the `<form>`, not `onClick` on the button, and Enter works too.

By default the browser sends the form to the server and loads a new page. In the Browser panel you see the page reload: the entry is gone, and so is everything typed. `event.preventDefault()` at the start of the handler stops that, and your code decides what happens instead.

```jsx
function report(event) {
  event.preventDefault()
  setFaults([{ id: crypto.randomUUID(), ...fault }, ...faults])
  setFault({ tram: '', what: '' })
}
```

A new item needs an id for its key, and `crypto.randomUUID()` makes one. Setting the form's state back to empty strings empties the fields, because each field shows its state.

## Showing what is wrong first

The best time to say what is wrong is while the visitor types, not after they press the button. Everything needed is already in state, so work it out while drawing:

```jsx
const left = 200 - fault.what.length
const ready = fault.tram.trim() !== '' && left >= 0
```

Then show a message when there is something to say, and switch the button off with `disabled={!ready}`. `trim()` removes spaces at both ends, so a field of spaces counts as empty. A disabled button is not enough on its own: a form can still be sent in other ways, so the submit handler checks `ready` again and stops when it is false.

## Your work in this issue

Everything happens in `src/Guestbook.jsx`. Make the name field controlled and show it in the preview, then the other two fields. Then sign the book without a reload and empty the form, and last, show what is wrong before the book is signed. The limit comes in as the `maxComment` prop. The check draws the book with entries and limits of its own, types, clears and types again, signs twice, and sends the form with a comment that is too long.
