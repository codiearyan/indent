# The board forgets everything overnight

## Two complaints on Tuesday morning

The board does a lot now. Two things still go wrong every day.

> **Marit:** The office system now writes the route list to a file every night, `data/routes.json`. But the board still shows the old list from the JavaScript file. And every morning the screen restarts and all the ticks are gone. Members ticked forty routes yesterday. Today, nothing.

Open `data/routes.json`. It looks like the array in `src/routes.js`, written as JSON, and it is newer. Your job is to load the board from that file, to say clearly when that does not work, and to keep the ticks across a restart.

## Asking for a file

`fetch` asks for something over the network and gives you a promise of the response. A path without a leading slash, like `data/menu.json`, is relative to the page, so it finds the file next to `index.html`. The response arrives in two steps: first the status and headers, then the body, which you read with `json()`.

```js
async function loadClasses() {
  const response = await fetch('data/classes.json')
  return response.json()
}
```

Both steps take time, which is why both are awaited, and why the function is `async`. An `async` function always returns a promise, so whoever calls it awaits it too.

## Drawing before the data arrives

This changes the shape of `main.js`. Until now the routes were there the moment the page started, because they were imported. Now the page starts with nothing and the routes arrive a moment later. So `routes` becomes a variable that starts as an empty array and is filled in when the data lands, and the first `render` waits for it.

People notice that moment. On a slow day it can last a second or two, and a blank board looks broken. Show a line that says the routes are loading before you start the fetch, and hide it once they are on the board. The page has a `#board-status` line ready for this.

## When loading fails

There are two different ways for a fetch to go wrong, and they behave differently.

If no answer comes back at all, because the network is down or the server cannot be reached, the promise rejects and `await` throws.

If an answer does come back, the promise resolves, even when the answer is bad news. A missing file is a `404` response and a crashed server is a `500`. Neither throws. The response has an `ok` property that is true only for the statuses that mean success, and it is up to you to look at it.

```js
const response = await fetch('data/classes.json')
if (!response.ok) throw new Error(`Got ${response.status}`)
```

Throwing your own error for a bad status means one `try` and `catch` can handle both kinds of failure in the same place. In the `catch`, tell people what happened in words they can use: the routes could not be loaded. Errors that nobody catches end up in the console, where no climber will ever see them.

## Remembering in the browser

The browser gives every site a small store of its own called `localStorage`. It survives reloads and restarts. It holds strings under keys:

```js
localStorage.setItem('theme', 'dark')
localStorage.getItem('theme') // 'dark'
localStorage.getItem('nothing') // null
```

Only strings. To store a list, turn it into JSON on the way in with `JSON.stringify`, and back with `JSON.parse` on the way out. A `Set` does not turn into JSON by itself, so spread it into an array first, and wrap the array back into a set when you load it.

Save after every change, in the same place the change happens. Load once, when the page starts.

## Trusting what you saved

Stored data outlives your code. Next month the save may hold the id of a route that was taken down. Someone may have poked at storage by hand and left text that is not JSON at all, and then `JSON.parse` throws. A board that refuses to start because of an old tick would be a poor trade.

So read storage defensively. Treat a missing key as an empty list. Catch a parse error and start with nothing ticked. And count ticks against the routes that are on the board today, which your counter from an earlier issue already does.

## Try it

Make the board load from the file first. To see the failure line, rename `data/routes.json` for a moment and reload the Browser panel, then put the name back. Then tick a few routes and reload the Browser panel. The check answers the fetch itself: sometimes with routes you have never seen, sometimes with a server error, sometimes with no answer at all. It also starts the page with ticks already saved, and once with a save that is broken.
