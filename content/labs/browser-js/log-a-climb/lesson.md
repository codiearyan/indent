# The form that reloaded the page

## New routes go up on Mondays

Until now, a new route reached the board when someone edited `src/routes.js`. The setters would rather do it themselves, from the desk, the moment a route is finished.

> **Hollis:** I added a form next to the board: name, grade, hold colour, setter. You fill it in, press Add route, and the whole page flashes and comes back the same as before. The route is not there. Whatever I had searched for is gone too.

Try it in the Browser panel. The page reloads, and the route never appears. Open `src/form.js`: `watchForm` is empty, so nothing on the page is listening to the form at all.

## What a form does by itself

Forms are older than JavaScript in the browser. Without any script, pressing a submit button collects every field that has a `name`, sends them to the address in the form's `action`, and loads whatever page comes back. With no `action`, that is the same page again. So the page reloads, every bit of state in memory is thrown away, and the board is drawn from scratch.

That default made sense when a server built every page. This board runs entirely in the browser, so you want to keep the page and handle the data yourself.

## Taking over the submit event

Before the browser sends anything, it fires a `submit` event on the form. Your listener runs first, and it can cancel what the browser was about to do:

```js
feedback.addEventListener('submit', (event) => {
  event.preventDefault()
  // the page stays, and the data is yours
})
```

Listen for `submit` on the form, not for `click` on the button. People also submit by pressing Enter in a text field, and the `submit` event covers every way in.

There is a bonus. The browser checks fields marked `required` before it fires `submit` at all. Leave the route name empty and the browser points at the field and asks for it, without your code running. You get that for free, and you should keep it.

## Reading the fields

You could find every field with `querySelector` and read its `value`. There is a shorter way. `FormData` reads a whole form at once, keyed by each field's `name` attribute:

```js
const data = new FormData(feedback)
data.get('rating') // the value of the field named rating
```

Select fields work the same way as text boxes. Values always come back as strings, so text that people typed should be trimmed before you use it.

## Checking what the browser cannot

The `required` attribute catches an empty field, but not a name made of three spaces, which is not empty as far as the browser is concerned. And the browser has no idea which routes are on the board, so it cannot stop a second route called the same as the first.

Those checks are yours. Put them after you read the fields and before you add anything. When there is a problem, say it in a plain sentence in the `#form-error` line and stop. A good message says what to fix, like "Give the route a name.", not "Invalid input". The line has `role="alert"`, so a screen reader reads it out as soon as it appears.

```js
if (seats < 1) {
  warning.textContent = 'Pick at least one seat.'
  warning.hidden = false
  return
}
```

When the input is fine, hide the line again, or the old message lingers next to a route that was added after all.

## Ready for the next one

Hollis sets four or five routes in a row. After each one is added, the form should be empty and the cursor back in the first field, so the next name can be typed straight away.

Forms have a `reset` method that puts every field back to its starting value. Any field can take the focus with its `focus` method, and `form.elements` gives you the fields of a form by name. Do both only when a route was actually added. When a route is refused, leave everything as it was, so the person can fix one word instead of typing it all again.

## Who adds the route

Open `src/main.js` and find the call to `watchForm`. It passes two functions. `isTaken` answers whether a name is already on the board, in any letter case. `onAdd` puts a new route on top of the board and draws it again. So `form.js` does not need to know how the board works. It only reads the form, decides whether the input is good, and hands over a clean route object. That split keeps each file small enough to read in one go.

## Try it

Stop the reload first and add a route. Then try a name of spaces and a name already on the board. Last, make the form ready for the next route. The check fills in routes you have never seen and ticks one of them, so it has to work like every route that came from the data.
