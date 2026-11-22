# A form that saves

## What you will be able to do

The screen loads the week, says when it is loading, and says what went wrong when it fails. So far it only reads. Now it gets a form beside the list, so people can book a place themselves. By the end of this issue you will be able to:

- send a form's data to an API as JSON, without a page reload
- make sure one press sends one booking, however slow the answer
- show the server's reason when it says no, and keep what was typed

## The request from Dilys

Dilys owns the studio. She has watched people use the sign-up sheet by the door for years, and she knows what goes wrong.

> **Dilys:** Ivo has put the form on the screen, but pressing the button just reloads the page. When it works, please make sure nobody books twice by pressing again because the wifi is slow: last month a man paid for two places at the same class. And when a class is full, tell people why it didn't work. Don't make them type their name again.

## What moved since the last issue

The code that asks the API and turns every failure into a sentence has moved out of `App.jsx` into `src/api.js`, so the form can use it too. `request(path, options)` takes the same options as `fetch`, resolves with the JSON of the answer, and rejects with an Error whose message a visitor can read: the server's own message when it sent one. `getWorkshops()` is one line on top of it. `App.jsx` does what it did before.

## Sending a form yourself

Without your help, a browser sends a form by loading a new page with the form's values. That is the reload Dilys saw. The submit event can be told not to, with `event.preventDefault()`, and then the code sends the data its own way.

A `fetch` that saves has three more parts than one that reads: the method, a header that says what the body is, and the body itself as text.

```jsx
await request('/api/kiln-slots', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ kilnId: 2, pots: 12 })
})
```

`JSON.stringify` turns the object into JSON text, and the header tells the server to read it as JSON. Leave the header out and many servers, the studio's among them, do not read the body at all.

Watch the types. The value of a `<select>` or an `<input>` is always text, even when the option was made from a number. An API that wants the number `2` may refuse the text `"2"`, so turn it into a number before you send it.

## One press, one booking

On a slow connection nothing seems to happen after the press, so people press again. Every press sends another request, and the server books every one of them.

The fix is a state that says a booking is on its way, set the moment the booking leaves, and used to disable the button. Setting it after the `await` would be too late: the second press comes while the first request is still waiting. Turn it off again once the answer is in, whatever it said. A `finally` block runs after the `try` block and after the `catch` block alike, so it covers both:

```jsx
setSaving(true)
try {
  await request(/* ... */)
} catch (failure) {
  // keep failure.message for the screen
} finally {
  setSaving(false)
}
```

Changing the button's words while it is off, such as "Booking...", tells people their press was heard.

## When the server says no

The server has the last word. The form cannot know that a workshop filled up a minute ago at the front desk; the server can, and it answers `409` with a reason. `request()` turns that into an Error with the server's message. Show it in an element with `role="alert"`.

Two details make a refusal bearable. Keep what was typed: clear the fields only after a booking that worked. And clear the old reason when a new booking starts, so a message from the last attempt never sits next to a new success.

## Your work in this issue

Everything happens in `src/BookingForm.jsx`, with `request()` from `src/api.js`. First send the booking and say when it is booked. Then make a second press impossible while the first is on its way. Last, show what the server refused.

To try it in the Browser panel, set `delayMs` in `server/settings.js` to 3000 and press twice. For a refusal, book Glazing basics twice: it has one place left. You will notice the card still says one place left after the first booking. That is the next issue.
