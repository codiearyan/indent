# The search shows what I typed before

## What you will be able to do

Imelda runs the lido. When a member renews at the desk, she finds them with the search box and picks them to see their visits. Each letter typed asks the membership system again, and the system takes its time: a short search matches many members and is slower to answer. By the end of this issue you will be able to:

- explain how two requests can answer in the opposite order to the one they were sent in
- see why an effect that sets state from every answer can end on the wrong one
- mend it by ignoring or cancelling the answer nobody wants any more
- keep the screen as quick as it was: no timers, no locked box

## The ticket

> **Imelda:** I typed "mar" to find Marnie, and the list showed everybody with an M in their name. I typed it again slowly and it was fine. Later I picked Mateo and then Delphine, and Delphine's card showed Mateo's visits. Can you look at BL-47?

## See it for yourself

Open the Browser panel.

1. Type "mar" quickly in the search box. For a moment the list shows Marnie. Then it fills up with every member with an m in their name.
2. Empty the box and type "mar" slowly, a letter a second. The list ends right.
3. Search for "e", pick Mateo and then, quickly, Delphine. Delphine's name is on the card with Mateo's visits under it.

The answers came in the wrong order, and the screen believed the last one to arrive.

## Answers that arrive out of order

Each letter changes `text`, and the effect sends a new search. Three letters, three searches, all on their way at once. Nothing promises they come back in the order they went: "m" matches more members, so it takes longer than "mar". The effect sets the results from whichever answer comes, so the slowest one wins, and it is the oldest.

The same happens anywhere a screen asks again before the last answer came: a tide table that loads a day, the visits of the member picked. Here is the tide table:

```jsx
useEffect(() => {
  loadTides(day).then(setTides)
}, [day])
```

Pick Monday, then Tuesday before Monday answers. If Monday is slower, Tuesday's tides show for a moment and then Monday's take their place, under Tuesday's heading.

## How to mend the cause

When `day` changes, React runs the cleanup of the effect from the old day before it runs the new one. That is the moment the old answer stops being wanted. A variable declared inside the effect belongs to that one run, so its cleanup can mark it:

```jsx
useEffect(() => {
  let ignore = false
  loadTides(day).then((found) => {
    if (!ignore) setTides(found)
  })
  return () => {
    ignore = true
  }
}, [day])
```

Every run has its own `ignore`. The newest run's is still false, so its answer shows the moment it comes, whatever is still out. Every older run's was set by its cleanup, so its answer changes nothing when it finally arrives.

You can also cancel the old request: make an `AbortController` in the effect, pass its `signal` to the request, and call `abort()` in the cleanup. A cancelled request fails with an `AbortError`, so catch it and show nothing for it: it is not a problem, it is a request nobody wants.

## When a blunt fix makes it worse

- **Waiting with `setTimeout` until the typing stops.** Every search gets slower, and a pause longer than the wait still lets an old answer come last.
- **Locking the box while a search is out.** The desk types at its own speed; letters go missing.
- **Showing nothing while any search is out.** The answer that is wanted then waits for the ones that are not, or the last one to arrive wins again.

## Your work in this issue

Everything happens in `src/MemberSearch.jsx`. First make the list show the search typed last, then make the card show the visits of the member picked last, then make sure every answer still wanted shows at once. `src/members.js` stands in for the membership system; the checks use one of their own that answers in whatever order they choose, so the race happens the same way on every run.
