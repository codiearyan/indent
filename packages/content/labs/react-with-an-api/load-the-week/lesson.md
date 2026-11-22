# Loading the workshops

## What you will be able to do

Kilnworth Pottery is the small studio on Saddler Street that runs evening and weekend workshops. Its API is done: it hands out this week's workshops as JSON. What is missing is the screen people book from. You are building it in React, and it starts empty. By the end of this issue you will be able to:

- ask a server for data when a component first appears, and only then
- keep what comes back in state, so React draws it
- tell "nothing has arrived yet" apart from "an empty answer arrived"

## The request from Ivo

Ivo builds the studio's sign-up page. He has the frame of the screen and a card for one workshop, but no workshops.

> **Ivo:** The API already answers `GET /api/workshops` with this week's list. Can the screen ask for it when it opens and show a card for each? And Dilys checked the screen on a slow connection and saw "No workshops this week" for a second before the list appeared. People leave when they read that.

A component so far has drawn what it was given. Now it has to go and get something, and the answer comes later. That changes where the code goes and what the screen shows in the meantime.

## The stand-in API

The real API runs on the studio's own computer. The Browser panel has no server behind it, so this repo ships a stand-in in `server/standIn.js`. It answers every `fetch` to an address that starts with `/api/`, after a short wait, with this week's workshops from `server/workshops.js`. Your code makes real requests with `fetch`, exactly as it would against the real API.

The stand-in writes one line per request to the Browser panel's console, so you can see what your screen asks for and how often. In `server/settings.js` you can make it slow, or make it fail. You will want that in the next issue.

## Where a request belongs

The body of a component runs every time React draws it. That happens at the start, and again after every state change. Look at this screen for a kiln's firing schedule:

```jsx
function Firings() {
  const [firings, setFirings] = useState([])
  fetch('/api/firings')
    .then((response) => response.json())
    .then((list) => setFirings(list))
  return <FiringList firings={firings} />
}
```

It draws, sends a request, and sets state when the answer comes. Setting state draws it again, which sends another request, which sets state again. It never stops.

Asking a server is a side effect: it reaches outside React. Side effects go in `useEffect`. React runs an effect after it has drawn the screen. The array after the effect says when to run it again: React compares each value in it with the last render, and an empty array means there is nothing that could change, so the effect runs once, after the first render.

```jsx
useEffect(() => {
  fetch('/api/firings')
    .then((response) => response.json())
    .then((list) => setFirings(list))
}, [])
```

Leave the array out entirely and the effect runs after every render, which brings back the same loop.

## Two promises

`fetch` returns a promise, and when the server answers it resolves with a `Response`. The body has not been read yet. `response.json()` reads it and returns a second promise, which resolves with the parsed value. That is why there are two `then` calls. Putting `response.json()` itself into state would put a promise there, not a list.

When the list arrives and goes into state, React draws the component again, and this time the list is there to map over. Each item of a list needs a `key` that stays the same between renders; an id from the server is the usual choice.

## Not here yet, or empty

Before the answer arrives the component still has to draw something. If the state starts as an empty array, the first render cannot tell "no answer yet" from "the answer was an empty list", and a screen that says "nothing here" for each case is wrong half the time.

Start from a value that says "not here yet" instead. `null` is common: `useState(null)`, then draw the list or the empty line only once the value is an array.

```jsx
{
  firings !== null && firings.length === 0 && <p>No firings booked.</p>
}
```

## Your work in this issue

Everything happens in `src/App.jsx`. `WorkshopCard` is written for you. First ask for the workshops once, when the screen opens, and keep them in state. Then draw a card for each. Last, make the empty line wait for an answer.

The screen runs in the Browser panel and reloads when you save. Keep its console open: one request line when the screen opens is right, a stream of them is the loop above. To see the gap before the answer, set `delayMs` in `server/settings.js` to 3000 and save.
