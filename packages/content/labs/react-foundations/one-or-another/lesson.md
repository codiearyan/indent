# Showing one thing or another

## What you will be able to do

Every screen so far shows the same parts for every item: each card has a number, each line a price. Real screens decide. A ride that is full should say so, a mark should only appear where it is true, and an empty list should say why it is empty. By the end of this issue you will be able to:

- choose between two pieces of JSX with the conditional operator
- show something only when a condition holds, with `&&`, without a stray `0`
- return early from a component, and return `null` to draw nothing at all
- tell apart an element that is empty and an element that is not there

## The request from Wilf

The rides screen at the stop lists the rides still to come today. Wilf keeps the list in `src/rides.js`.

> **Wilf:** The rides screen says every ride is step-free, which is not true of the Foundry Belle, and it says the ten thirty has "0 seats left". Just say Full! It also says "0 wheelchair spaces", which nobody needs to read. And when the last ride has gone, I want it to say so, not show an empty box. Oh, and I write a notice some days. Can it show that, and nothing on the days I don't?

Open the Browser panel and you will see every one of those problems.

## One or the other

JSX has no `if` inside it: the curly braces take an expression, and `if` is a statement. The bundler stops on `{if (...)}` with `Unexpected "if"`. The expression that chooses is the conditional operator, `condition ? this : that`:

```jsx
<span className="door">{car.doorsOpen ? 'Doors open' : 'Doors closed'}</span>
```

It works for whole elements too, and inside an attribute: `className={car.late ? 'time late' : 'time'}` gives an element one class or two.

When the choice gets long, decide above the `return`, where `if` is allowed, and put the result in the JSX:

```jsx
let label = 'On time'
if (car.minutesLate > 0) label = `${car.minutesLate} minutes late`
return <span className="time">{label}</span>
```

## Something or nothing

Often one side of the choice is "nothing". React draws nothing for `false`, `null`, `undefined` and `true`, so `&&` does the job: when the left side is false, the whole expression is false and nothing appears; when it is true, you get the right side.

```jsx
{car.heated && <span className="tag">Heated</span>}
```

This is not the same as an element that is empty. `<span className="tag"></span>` is still on the page: it can take up space, carry a background, be found by a screen reader. If something does not apply, leave the element out altogether.

## The 0 that shows up

`&&` has a trap. It does not give back `false` when the left side is falsy; it gives back the left side itself. React draws nothing for `false`, but it draws numbers, and `0` is a number:

```jsx
{car.bikeSpaces && <span>{car.bikeSpaces} bike spaces</span>}
```

With no bike spaces this puts a lone `0` on the screen. The same happens with `list.length && ...` on an empty list. Make the left side a real true or false: `car.bikeSpaces > 0 && ...`. An empty string is falsy too, but React draws nothing for it, so `text && ...` is safe for text.

## Return early

A component is a function, so it can return early. When the whole component depends on one condition, decide before building the JSX:

```jsx
function Departures({ cars }) {
  if (cars.length === 0) {
    return <p className="quiet">No departures</p>
  }
  return <ul>{cars.map((car) => <li key={car.id}>{car.name}</li>)}</ul>
}
```

And a component that has nothing to show can return `null`. React draws nothing for it, and the place where it is used stays as if it were not there:

```jsx
function Warning({ message }) {
  if (!message) return null
  return <p className="warning">{message}</p>
}
```

A component that returns nothing at all, by forgetting its `return`, also draws nothing. Writing `return null` says you meant it.

## Your work in this issue

Everything is in `src/Rides.jsx`. Fix `RideRow` first, one mark at a time, and watch the rides screen after each save. Then make `RideList` say when there are no more rides. Last, write `Notice` and use it in `src/App.jsx` with Wilf's notice from `rides.js`. The check draws your components with rides of its own: full and not, step-free and not, with spaces and without, and an empty day.
