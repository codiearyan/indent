# Props

## What you will be able to do

The ride board reads Wilf's plan, but it is one component that only knows about one file. The screen in the tram shed needs a card for each tram on show, and every card looks the same with different words in it. By the end of this issue you will be able to:

- write a component that takes props, so the same component can draw different things
- pass props to a component, as text or as values
- show what is put between a component's tags, with `children`
- give a prop a value to fall back on when it is not passed

## The request from Elspeth

> **Elspeth:** The shed screen has a card for each tram on show. Someone copied the first card twice and changed the words, and look: the Foundry Belle says it was built in 1904, and two trams are number 14. Every time we move a tram, I copy another card. Can there be one card that fills itself in?

Open `src/App.jsx`. The three cards are written out in full, with the mistakes Elspeth found. The real list is in `src/trams.js`.

## Props are the arguments of a component

A component is a function, and like any function it can take arguments. React collects the attributes written on a component's tag into one object, the props, and passes it as the first parameter:

```jsx
function Exhibit(props) {
  return (
    <article className="exhibit">
      <h3>{props.title}</h3>
      <p>Found in {props.year}</p>
    </article>
  )
}

<Exhibit title="Brass bell" year={1896} />
```

Most components take the props apart right in the parameter list, with destructuring, so each one has its own name:

```jsx
function Exhibit({ title, year }) {
  return (
    <article className="exhibit">
      <h3>{title}</h3>
      <p>Found in {year}</p>
    </article>
  )
}
```

The names must match on both sides. Pass `title` and read `name`, and `name` is `undefined`: React shows nothing for it and says nothing either. When a card comes out blank, compare the names first.

Writing `function Exhibit(title, year)` does not work. React passes one object, so `title` would be the whole props object, and showing it stops the page with `Objects are not valid as a React child`.

## Passing props

On the tag, a prop in quotes is text. A prop in curly braces is any JavaScript value: a number, a field of an object, the result of a call.

```jsx
<Exhibit title={finds[0].title} year={finds[0].year} />
```

When an object already has fields with the right names, spread syntax passes all of them at once: `<Exhibit {...finds[0]} />` is the same as writing each one out.

Props flow one way, from the component that uses the tag down to the component that draws it. A component reads its props and never changes them; if a value has to change, it changes where it comes from. A later issue shows why that matters.

## What goes between the tags

A component can also be written with an opening and a closing tag, and something in between:

```jsx
<Exhibit title="Brass bell" year={1896}>
  <p>Ring it gently.</p>
</Exhibit>
```

Whatever sits between the tags arrives as one more prop, always called `children`. The component decides where it appears, by putting `{children}` in its JSX. If it never does, what was passed is quietly dropped. `children` can be text, one element, or several.

## A value to fall back on

A prop that is not passed is `undefined`. Destructuring lets you give it a default right where it is named:

```jsx
function Exhibit({ title, year, room = 'Main hall' }) {
  return <p>{title}, in the {room}</p>
}
```

`<Exhibit title="Brass bell" />` says "in the Main hall", and `<Exhibit title="Brass bell" room="Annexe" />` says "in the Annexe". The default only applies when the prop is missing.

## Your work in this issue

Write `TramCard` in `src/TramCard.jsx` first. Then open `src/App.jsx` and replace the hand-written cards with one `TramCard` for each tram in `trams`, passing its number, name and year. Then come back to `TramCard` for `children` and the status. The Browser panel reloads every time you save, so you can watch the copied mistakes disappear. The check draws your card with trams of its own, and changes `trams.js` to see App follow.
