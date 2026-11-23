# Data that arrives later

## What you will be able to do

Every screen so far had its data from the start, imported from a file in `src`. Real data often lives somewhere else and has to be asked for, and the answer comes later, or not at all. Asking is talking to the world outside React, so it happens in an effect. By the end of this issue you will be able to:

- ask for data with `fetch` from an effect, and keep the answer in state
- say that the data is loading, and say so in plain words when it fails
- tell an error status from a request that got no answer
- make sure an answer that arrives too late changes nothing

## The request from Elspeth

The ride board by the ticket window shows the rides of one day.

> **Elspeth:** Visitors keep asking about the weekend. Wilf does the rota, and once it's done I save each day's rides in the timetable folder, one file per day. Can the board load whichever day they pick? Monday's file isn't there yet, so it should say so politely, not just sit there blank.

Open `src/Timetable.jsx` and the files in `timetable/`. The day picker in `App.jsx` already works; `Timetable` gets the day as a prop and shows nothing.

## Asking for data

`fetch` asks for an address and returns a promise of the answer. The answer's `json()` returns a promise of the data in its body:

```jsx
const response = await fetch('/repairs/14.json')
const repairs = await response.json()
```

An address that starts with `/` is read from the top of your workspace, so the Browser panel loads `timetable/sat.json` from the file you can open in the editor. The check gives the page a `fetch` of its own instead, with days and rides of its own, and holds each answer back as long as it likes.

## Async inside an effect

`await` only works inside an async function, but the effect itself must not be one: an async function always returns a promise, and an effect returns nothing or its cleanup. Write `useEffect(async () => ...)` and React prints ``%s must not return anything besides a function, which is used for clean-up.`` in the console, followed by `useEffect` and `It looks like you wrote useEffect(async () => ...)`. So write the async function inside the effect and call it:

```jsx
useEffect(() => {
  async function load() {
    const response = await fetch(`/repairs/${tram}.json`)
    setRepairs(await response.json())
  }
  load()
}, [tram])
```

The effect uses `tram`, so `tram` is in its list: a new tram asks again, and nothing else does. Without the list, every answer would set state, draw again, and ask again.

## Loading

Between asking and the answer, the screen should say what is going on. That is one more piece of state, switched on when the request goes out and off when it is done, and the screen shows either the loading line or the data. When the tram changes, the old tram's repairs are still in state, so show the loading line instead of them, not above them.

## When it goes wrong

A request can fail in two ways. The server can answer with an error status, like 404 when there is no such file. `fetch` does not reject for that: the answer arrives with `response.ok` set to `false`, and its body is not your data. Read it anyway and `json()` throws, or worse, it works and the screen tries to draw an error message as a list. Or there is no answer at all, and `fetch` rejects.

Throw your own error when `ok` is false, and one `catch` handles both. `finally` runs after either way, which is the place to switch loading off:

```jsx
try {
  const response = await fetch(`/repairs/${tram}.json`)
  if (!response.ok) throw new Error(`Repairs answered ${response.status}`)
  setRepairs(await response.json())
} catch {
  setProblem('The repair log could not be loaded.')
} finally {
  setLoading(false)
}
```

Write the problem in words for a person. `Failed to fetch` or `Unexpected token` mean nothing to a visitor at a ticket window. Clear the problem when a new request goes out, so a failed day does not haunt the next one.

## Answers out of order

Answers do not always arrive in the order they were asked for. Pick Saturday, then Sunday: if Saturday's answer is slower, it arrives last and the board shows Saturday's rides under Sunday. Nothing warns you.

The cleanup is the fix. When `tram` changes, React runs the old effect's cleanup before the new effect. Each run of the effect has its own variables, so a flag declared inside it belongs to that request alone:

```jsx
useEffect(() => {
  let ignore = false
  async function load() {
    // ...
    if (!ignore) setRepairs(data)
  }
  load()
  return () => {
    ignore = true
  }
}, [tram])
```

Check the flag before every `set...` of that run, the problem and loading included. You can also cancel the request: hand `fetch` the `signal` of an `AbortController` and call `abort()` in the cleanup. A cancelled `fetch` rejects too, so a cancel must not end up on the screen as a problem.

You can see this in the Browser panel. `<StrictMode>` runs the effect, cleans up and runs it again, so the first request of the page is always one whose answer nobody wants.

## Your work in this issue

Everything happens in `src/Timetable.jsx`. First load the chosen day's rides from an effect, then say when they are loading, then say so when they cannot be loaded, and last, make sure the day picked last is the one on the screen. The check holds every answer back, answers with errors and with nothing, and answers in the wrong order.
