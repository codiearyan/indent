# State that is an object or a list

## What you will be able to do

The door counter keeps a number and a true or false in state. Real screens keep more: a set of options, a list that grows and shrinks, a line whose quantity goes up. Objects and arrays work in state too, with one rule that numbers never made you think about. By the end of this issue you will be able to:

- say why changing an object or an array in state does not change the screen
- replace an object in state with a new one that keeps the fields you did not change
- add an item to a list in state, take one out, and change one in place of the old
- keep a list's keys right while items leave it

## The request from Anjali

The gift shop's till has a screen, and Anjali wants it to keep the basket for her.

> **Anjali:** I press Add next to a mug and nothing goes in the basket. Gift wrap doesn't stay on when I press it, and Paper bag does nothing. When someone buys three postcards, I want one line that says three, not three lines. And when they change their mind, I need to take a line out again.

Open `src/Till.jsx`. `toggleWrap` is already written, and it looks reasonable. Press Gift wrap and watch: nothing.

## Same object, no new draw

When you call a setter, React compares the new value with the one it has. If they are the same, it does not draw again. For a number, "the same" means the same number. For an object or an array, it means the very same object, not one with the same contents.

```jsx
function toggleNight() {
  settings.night = !settings.night
  setSettings(settings)
}
```

This changes a field of the object React already holds, then hands React that same object. React sees nothing new and draws nothing. There is no error and no warning, in the check or in the Browser panel: the screen simply stays as it was. Worse, the next time something else is drawn, the old change may suddenly show up, at a moment that has nothing to do with it.

So treat objects and arrays in state as read-only. To change one, make a new one and hand that to the setter.

## A new object

The spread syntax, `...`, copies the fields of an object into a new one. Fields written after it replace the copied ones:

```jsx
setSettings({ ...settings, night: !settings.night })
```

That is a new object, with every field of the old one, and `night` turned round. Leave out the spread and you get an object with `night` only: every other field is gone, and whatever read it now gets `undefined`.

## Lists in state

Arrays have methods that change them in place, like `push`, `splice` and `sort`, and methods that return a new array, like `map`, `filter` and the spread. In state, use the second kind:

```jsx
// add at the end
setJobs([...jobs, { id: 'j-7', task: 'Oil the points', done: false }])

// take one out
setJobs(jobs.filter((job) => job.id !== id))

// change one: a new array, with a new object where the old one was
setJobs(jobs.map((job) => (job.id === id ? { ...job, done: true } : job)))
```

`map` keeps every other job as it is and puts the changed one in the same place. Before adding, `jobs.some((job) => job.id === id)` tells you whether a job is already there.

Anything that can be worked out from the list, like a total or a count, is not state of its own. Work it out while drawing, the way `Till` already works out `total` with `reduce`, and it is always right.

## Keys when items leave

When a line leaves the list, the key is what tells React which elements stay. A key from the item's own id keeps each element with its item. The index from `map` looks fine while lines are only added at the end, but take the first one out and every other line moves up a place: React keeps the elements by place and hands each one a different line. The check takes a line out and looks for exactly that.

One more thing to watch for in the Browser panel: the props object a component is given is frozen. Assign to it, `props.line = ...`, and the panel stops with `Cannot assign to read only property`. A component changes nothing it is given; it asks its owner, with a function from its props.

## Your work in this issue

Everything happens in `src/Till.jsx`. First fix Gift wrap and write Paper bag, so each switches on and off without touching the other. Then keep the basket in state and draw it with `BasketLine`, make adding the same item again raise its quantity, and give each line a Remove button. The check draws the till with a shelf of its own, two items of which cost the same, and adds and removes items in a row.
