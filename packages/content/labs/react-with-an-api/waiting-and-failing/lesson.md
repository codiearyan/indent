# While it loads, and when it fails

## What you will be able to do

The sign-up screen now loads this week's workshops and draws a card for each. That is the good day. On a bad day the studio's connection is slow, or the server is restarting, or the internet is down, and the screen just stays blank. By the end of this issue you will be able to:

- describe where a request is with one status value
- show a loading line while it travels
- turn every kind of failure into a sentence a person can read
- ask again from a button, without reloading the page

## The request from Sunniva

Sunniva runs the front desk and answers the phone when the screen does not work.

> **Sunniva:** Two people rang this morning to ask if we had stopped running workshops. The page was just empty. I think the server was being restarted. If it is slow, say so. If it is broken, say so, and give them a button to try again, so they don't have to ring me.

## One status, three moments

A request has three moments from the screen's point of view: it is on its way, it arrived, or it failed. You could keep two flags, `isLoading` and `hasFailed`, but nothing stops both from being true at once, and then the screen shows a spinner beside an error. One value with a few possible words cannot contradict itself:

```jsx
const [status, setStatus] = useState('loading')
```

Set it to `'ready'` when the data is in and `'failed'` when anything goes wrong, then draw each part of the screen from it. While it is `'loading'`, show a short line. Give that line `role="status"`, so a screen reader announces it, and an error `role="alert"`.

## What counts as a failure

Here is the surprise. `fetch` rejects only when no answer came at all: the network is down, or the address cannot be reached. When the server answers with an error status, such as 404 or 503, that is still an answer. `fetch` resolves with it, and your code carries on as if all were well.

So look at `response.ok` yourself. It is true for statuses from 200 to 299. When it is false, throw, and the failure joins the network failures in the same `catch`.

The studio's API puts the reason for an error in the body: `{ "error": { "code": "unavailable", "message": "..." } }`. The `code` is for programs, the `message` is for people, so the message is what the screen should say. But do not trust every error body to be that JSON. Between the browser and the API there can be other machines, and when one of them fails it may answer with a web page. Reading that page with `response.json()` rejects with a message about an unexpected token, which no visitor should ever see. Read the body carefully, and fall back to a sentence of your own:

```jsx
if (!response.ok) {
  const body = await response.json().catch(() => null)
  throw new Error(body?.error?.message ?? 'The kiln log had a problem.')
}
```

`.catch(() => null)` turns a body that cannot be read into `null`, and `?.` stops at the first missing part, so a web page, an empty body and the API's JSON all end in a sentence.

The network failure needs the same care. When `fetch` rejects, its error says something like `Failed to fetch`, which is the browser talking to a developer. Catch it and throw your own sentence instead. A good shape is one `async` function that asks, and whatever goes wrong, rejects with an Error whose message a person can read. The component calls it from its effect and puts `error.message` into state when it fails.

## Trying again

A Try again button has to make the effect run once more. An effect runs again when a value in its array changes, so one simple way is a number in state that the button adds one to:

```jsx
const [attempt, setAttempt] = useState(0)
useEffect(() => {
  // ask, then set the status
}, [attempt])
```

The button sets the status back to `'loading'` and adds one to `attempt`. React draws the loading line, then runs the effect again because `attempt` changed. Reloading the whole page would also ask again, but it throws away everything else on the screen, such as a form someone was filling in.

## Your work in this issue

Everything happens in `src/App.jsx`. Add the status and the loading line first. Then handle the three kinds of failure: an error status with the API's message, no answer at all, and an error answer that is not JSON. Last, put a Try again button in the alert.

Use `server/settings.js` to see each case in the Browser panel. `delayMs: 3000` gives you time to see the loading line. `failure: 'always'` makes every request fail, and `failAs` picks between a 503 with a message and no answer at all. `failure: 'first'` fails only the first request, so Try again works on the second.
