# State two components share

## What you will be able to do

So far each piece of state lived in the one component that used it. Often, though, two components side by side have to show the same thing, and when one changes, the other has to follow. By the end of this issue you will be able to:

- say why two components that each keep a copy of the same value drift apart
- move state up into the component that draws both, and hand it down as a prop
- hand down a function, so a component lower down can ask for a change
- keep one source of truth, and work everything else out from it

## The request from Wilf

In the shed, next to the trams on show, there is a screen with a list of the trams on one side and a big panel about one of them on the other.

> **Wilf:** A lad pressed the Wenlow Open-top in the list and the panel kept on about the Kettleby Car. Then he pressed Next tram on the panel and the list stayed lit on the wrong one. The two halves of that screen don't talk to each other. Can you make them agree?

Open `src/TramGuide.jsx`: `TramGuide` draws `TramList` and `TramPanel` side by side. Press a tram in the list, then Next tram, and watch them disagree.

## Two copies disagree

`TramList` and `TramPanel` each call `useState` for the chosen tram. That gives two separate pieces of state that happen to start equal. Each component on the page has its own state, and nothing links one to the other: setting the list's choice draws the list again, and the panel never hears about it.

Here is the same mistake on another screen, a week of opening days with tabs at the top and the day's board below:

```jsx
function DayTabs({ days }) {
  const [day, setDay] = useState(days[0])
  // ...
}

function DayBoard({ days }) {
  const [day, setDay] = useState(days[0])
  // ...
}
```

Two values that must always be equal are one value too many.

## Move the state up

The fix is to keep the value in one place: the closest component that draws both. That component holds the state and hands it down to each child as a prop.

```jsx
function OpeningWeek({ days }) {
  const [day, setDay] = useState(days[0])
  return (
    <>
      <DayTabs days={days} day={day} />
      <DayBoard day={day} />
    </>
  )
}

function DayTabs({ days, day }) {
  return days.map((d) => (
    <button key={d} aria-pressed={d === day}>{d}</button>
  ))
}
```

`DayTabs` no longer has state for the day. It draws whatever its `day` prop says, so it can never disagree with `DayBoard`, which is drawn from the same value. This is called lifting state up.

A tempting half-way step is to keep a copy in the child, started from the prop: `const [mine] = useState(day)`. It looks fine at first, but the starting value of `useState` is read only on the first draw. When the parent hands down a new `day`, the copy stays as it was. If a child should show what it is told, it uses the prop itself.

## Changes travel up

Now the tabs cannot change the day. A prop belongs to the component that passed it, and a component never changes its props. In the Browser panel, assigning to one, as in `props.day = d`, stops the page with `Cannot assign to read only property`.

So the child asks. You met this with `TicketButton`: the owner hands down a function, and the child calls it when something happens.

```jsx
<DayTabs days={days} day={day} onPick={setDay} />

<button onClick={() => onPick(d)}>{d}</button>
```

The tab says which day was pressed. `OpeningWeek` sets its state, React draws `OpeningWeek` again, and both children are drawn from the new day. The data goes down as props, and the requests to change it come up as calls.

The arrow matters as much as it did in the kiosk. Write `onClick={onPick(d)}` and the call happens while the tabs are being drawn, which sets the parent's state in the middle of drawing. React warns in the console: ``Cannot update a component (`%s`) while rendering a different component (`%s`)``, followed by the two names.

## One source of truth

After the move, `day` lives in exactly one place. Everything else is worked out from it while drawing: which tab is marked, which board is shown, and anything else that depends on the day, like `days.indexOf(day) + 1` for "day 2 of 7". Do not add a second piece of state for something you can work out from the first; it is the same mistake again, in one component.

The function that changes the state lives with the state, too. A "next day" button only needs to say that it was pressed; the owner, who has the whole week, decides which day comes next.

## Your work in this issue

Everything happens in `src/TramGuide.jsx`. First move the chosen tram into `TramGuide` and hand it down: its number to the list, the tram itself to the panel. Then let the list choose a tram through an `onChoose` prop, and last, let the panel's Next tram button call `onNext`, with `TramGuide` doing the moving. The check draws each component on its own with trams of its own and props it changes, then presses trams and Next tram in `TramGuide` and looks at both halves after every press.
