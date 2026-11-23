# The card shows the member picked first

## What you will be able to do

Members of the lido show their card at the desk, and Agnieszka picks them from a list to see their pass and how many swims they have had this season. The membership system answers a moment later, over the network. A press of the + key logs a swim. By the end of this issue you will be able to:

- tell an effect that runs too rarely from one that runs too often
- read a dependency list and say what is missing from it
- clean up a listener so it never piles up or outlives its screen
- check that typing and drawing do not set an effect off again

## The ticket

> **Agnieszka:** I picked Mateo and the card still said Hettie. I logged Mateo's swim on Hettie's card before I noticed. And when I press plus, the console says the swim was logged three or four times. Can you look at BL-44?

## See it for yourself

Open the Browser panel and its console.

1. The card loads Hettie Penrose. Pick Delphine in the list. The button turns on, and the card still shows Hettie.
2. Press + on the keyboard once. The console says the swim was logged, more than once. Press again: more lines each time.
3. Type a few letters in the note box, click outside it, and press + once. The console fills up.

Two effects, two opposite mistakes: one runs too rarely, the other far too often.

## An effect that does too little

An effect runs after the first draw, and then again only when a value in its dependency list changed since the draw before. An empty list never changes, so an effect with `[]` runs once.

Here is a weather panel by the pool:

```jsx
function Weather({ town }) {
  const [report, setReport] = useState(null)
  useEffect(() => {
    loadWeather(town).then(setReport)
  }, [])
  return <p>{report ? report.text : 'Loading…'}</p>
}
```

It loads the first town and never another. Pick a new town and `town` changes, but the effect is not told, because `town` is not in its list. React prints nothing: the panel quietly shows the old town. The rule is short: list every prop, state and value worked out from them that the effect uses. Here that is `[town]`.

Once it runs again for a new town, what it showed for the old town is still in state until the answer comes. If the screen must not show it under the new name, set it back at the start of the effect.

Pick two towns quickly and both answers are on their way at once. The first town's answer must not land under the second town's name when it comes late. The cleanup runs when `town` changes, so a flag declared in the effect and set in its cleanup keeps that answer out, as you did when data first arrived later. The last ticket looks at this race closely.

## An effect that does too much

With no list at all, an effect runs after every draw. That is fine only when its cleanup undoes it each time. A listener added on every draw and never removed piles up: one per draw, each with the values of the draw it was made in, and each one answers the key. The cleanup is the function the effect returns; React calls it before running the effect again and when the component leaves the screen:

```jsx
useEffect(() => {
  function onResize() {
    setWide(window.innerWidth > width)
  }
  window.addEventListener('resize', onResize)
  return () => window.removeEventListener('resize', onResize)
}, [width])
```

The listener reads `width` from the draw it was made in, so the list names it. Each time `width` changes, the cleanup takes the old listener away and the effect adds a new one, so there is only ever one, and it reads the newest value.

## When a blunt fix makes it worse

- **An empty list on the listener.** It is added once, in the first draw, before the member arrived, so it never logs anything. Without a cleanup, `StrictMode` adds it twice.
- **No list on the loading effect.** It loads after every draw, every letter typed in the note box included, and each answer draws the card again.
- **A flag outside the component that says the listener is added.** The listener then belongs to the first card ever drawn, and keeps hearing keys after it is gone.

## Your work in this issue

Everything happens in `src/MemberDesk.jsx`. First make the card follow the member picked, then make + log exactly one swim per press and nothing once the card is gone, then make sure typing a note asks the membership system for nothing. `src/members.js` stands in for the membership system; the checks use one of their own that answers only when they say so.
