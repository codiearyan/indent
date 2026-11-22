# Answers that arrive late

## What you will be able to do

The screen loads, fails gracefully, books and stays in step with the server. In this last issue it gets a day picker, and with it a problem every screen that loads data has sooner or later: answers that arrive in a different order than they were asked for. By the end of this issue you will be able to:

- load data that depends on a choice, and load it again when the choice changes
- make sure only the newest answer reaches the screen
- cancel requests nobody is waiting for any more
- explain what StrictMode does with effects while you develop

## The request from Kofi

Kofi teaches most of the studio's classes, and people ask him what is on before they ask anyone else.

> **Kofi:** Ivo put day buttons above the list, so people can see just Thursday. They don't do anything yet. And when you get them working, please test them on the studio's wifi. Ivo tapped Tuesday and then Thursday, and for a moment the screen showed Tuesday's classes under Thursday.

## Data that depends on a choice

The API can filter by day: `GET /api/workshops?day=thu`. The day is in state now, and the list depends on it, so the effect that loads the list has to run again whenever the day changes. That is exactly what its array is for: put `day` in it beside `attempt`, and React runs the effect again when either changes.

When the day changes, the cards on the screen belong to the old day. Showing them under the new one would be wrong, so a new day is a moment with nothing to show yet: back to the loading line until its list arrives.

## Who answers first

Someone taps Tuesday, then Thursday. Two requests are on their way. Nothing promises they come back in order: Tuesday's may be slower, because its list is longer, or because the network is having a moment. If Thursday's arrives first and Tuesday's after it, the code that sets state when an answer arrives happily puts Tuesday's workshops on the screen, with the Thursday button pressed. That is what Ivo saw.

React gives each run of an effect a cleanup: the function the effect returns. Before it runs the effect again for the new day, React calls the cleanup of the old run. A variable made inside the effect belongs to that one run, so the cleanup can mark it, and the answer can check the mark before it touches state:

```jsx
useEffect(() => {
  let wanted = true
  loadFirings(kiln).then((list) => {
    if (wanted) setFirings(list)
  })
  return () => {
    wanted = false
  }
}, [kiln])
```

An answer for a kiln that is no longer chosen now arrives and is dropped.

## Cancelling instead of ignoring

Ignoring an old answer still lets it travel all the way, and still runs everything up to the check. `fetch` can do better: hand it the `signal` of an `AbortController`, and `abort()` cancels the request.

```jsx
const controller = new AbortController()
fetch('/api/firings', { signal: controller.signal })
// later
controller.abort()
```

A cancelled `fetch` rejects with an error named `AbortError`. That is not a failure anyone should see: it happened because your code asked for it. The `catch` that shows the alert has to tell the two apart and do nothing for a cancel. Mind every place a rejection passes on the way, too. A helper that turns every rejection into "could not be reached" turns a cancel into a fake failure.

The cleanup is the natural place to cancel, and it runs at two moments: before the effect runs again, and when the component goes away for good. So one `controller.abort()` in the cleanup covers both a new day and a screen that has closed. React 19 quietly ignores state set on a component that is gone, but the request still travelled and anything else its answer starts still happens. Cancelling stops it at the source.

## StrictMode runs it twice

`src/main.jsx` now wraps the app in `StrictMode`, as most React projects do. While you develop, StrictMode runs each effect, then its cleanup, then the effect again, the moment a component first appears. It does this on purpose, to show effects whose cleanup is missing or wrong.

So when the screen opens, the console shows two requests for the week. Without a cleanup both are answered and both set state. With your cleanup, the first one is cancelled and only the second reaches the screen. In a built app, StrictMode does none of this, and the effect runs once.

## Your work in this issue

Everything happens in `src/App.jsx` and `src/api.js`. First make the list follow the chosen day. Then make sure an old day's answer can never reach the screen. Last, cancel the requests nobody waits for, and keep a cancel from looking like a failure.

Set `randomDelay: true` in `server/settings.js` and answers take anything from a tenth of a second to two seconds, so tapping between days quickly shows the race. The stand-in writes `cancelled` in the console for every request your code cancels.
