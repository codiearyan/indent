# Stock that arrives late

## The racks move online

Sidewinder has started selling a few records online, and the stock list can no longer live inside the code of the counter screen. It now comes from the shop's server, as a file at `data/stock.json`.

> **Noor:** Since the change this morning the screen is empty. And the shop's internet drops out when the kettle and the heater are on at the same time, so whatever you do, make it say something useful when that happens.

Open `src/App.jsx`. The import of the stock is gone, and `stock` is an empty array. This issue loads the data from the server, shows what is happening while it travels, and then tidies the loading code into a hook of its own.

## Asking the server

`fetch` sends a request and returns a promise of the response. The body comes later, through another promise.

```jsx
fetch('data/rota.json')
  .then((response) => response.json())
  .then((shifts) => setShifts(shifts))
```

Where does this go? Not in the body of the component. The body runs on every render, and setting state from it starts another render, which would fetch again, and again. Asking a server is a side effect, so it goes in an effect. With an empty dependency array it runs once, after the screen first appears.

The records arrive after the first render, so keep them in state, starting as an empty array. When they come in, setting the state draws the screen again with the real stock.

## The three moments of a request

From the counter's point of view a request has three moments. It is on its way, it arrived, or it failed. A single status value with three possible words describes this better than separate true or false flags, which can end up saying "loading" and "failed" at the same time.

```jsx
const [status, setStatus] = useState('loading')
```

Set it to ready when the data is in, and to failed when anything goes wrong. Then draw the screen from it: a short line while loading, a plain message and a button when it failed, and the list only when it is ready.

## Failures that do not throw

Here is a surprise. `fetch` only rejects when the request could not be made at all, for example when the network is down. If the server answers with an error, such as status 404 or 500, `fetch` still resolves with that response. Calling `response.json()` on an error page then fails in a confusing way, or worse, succeeds with something that is not your data.

So check `response.ok` yourself, and throw when it is false. Then both kinds of failure end up in the same `catch`, and the screen says the same thing for both.

```jsx
.then((response) => {
  if (!response.ok) throw new Error(`Status ${response.status}`)
  return response.json()
})
```

## Trying again

A Try again button has to make the effect run once more. An effect runs again when a value in its dependency list changes, so one simple way is a counter in state that the button increases. The effect depends on it, sets the status back to loading, and asks again.

There is one more detail worth knowing. If a request is still on its way when the effect runs again, the old answer may arrive after the new one. A local flag set in the cleanup lets the old request know its answer is no longer wanted.

## Custom hooks

`App` now mixes two jobs: drawing the counter screen and talking to the server. A custom hook lets you move the second job out. A hook is a plain function whose name starts with `use` and which calls other hooks. Whatever state and effects it uses belong to the component that calls it.

```jsx
function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return now
}
```

Any component can now call `useClock()` and get the time, without knowing how it is kept up to date. In the same way, `useStock()` can hand `App` the records, the status and a retry function, and `App` goes back to describing the screen.

## Try it

Load the stock in `App` first and get the list back on screen. Then add the status, the loading line, the failure line and Try again. To see the failure in the Browser panel, rename `data/stock.json` for a moment and save. Finally, move the state and the effect into `useStock` and call it from `App`. The check plays the server itself: slow, broken, and offline.
