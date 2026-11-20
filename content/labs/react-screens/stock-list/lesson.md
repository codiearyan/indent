# One long component

## Your first morning at Sidewinder

Sidewinder Records sells second-hand vinyl from a narrow shop with long wooden racks. Behind the counter sits a tablet that runs one screen: the stock on the left, and a hold shelf on the right where staff set records aside for customers.

> **Noor, the owner:** A friend wrote the screen for us last spring. It shows three records, and it says every one of them is sold. We have eight in the racks today, and only two are sold. Can you make it show what is really there?

Open `src/App.jsx`. The whole screen is one function, and the three cards are written out by hand, with the same Sold mark in each. The real stock sits in `src/stock.js`, and nothing reads it. This issue turns that one long component into parts that are drawn from data.

## A component is a function that returns markup

In React, a component is a JavaScript function whose name starts with a capital letter and which returns JSX. JSX looks like HTML, but it is JavaScript, so you can put any expression inside curly braces.

```jsx
function NeedleBadge() {
  return <span className="badge">New needle</span>
}
```

You use a component like a tag: `<NeedleBadge />`. React calls the function and puts what it returns on the page. Two details trip people up. Use `className`, not `class`, because `class` is a reserved word in JavaScript. And a component returns one outer element, so wrap siblings in a parent.

## Props carry the data in

A component that always shows the same thing is not much use. Props let the caller hand it data. React collects the attributes you write on the tag into one object and passes it as the first argument.

```jsx
function SpeakerCard({ speaker }) {
  return (
    <article className="speaker">
      <h3>{speaker.name}</h3>
      <p>{speaker.watts} watts</p>
    </article>
  )
}

<SpeakerCard speaker={{ name: 'Bookshelf pair', watts: 40 }} />
```

The curly braces in the parameter list pull `speaker` out of the props object. Inside the JSX, `{speaker.name}` switches back to JavaScript and drops the value in. Nothing on the card is typed in by hand, so the same component can draw any speaker.

That is the job of `RecordCard`: one card, filled from one `record`.

## Drawing a list from an array

JSX can hold an array of elements, and React draws them in order. So the way to turn data into a list is `map`: one element out for each item in.

```jsx
function SpeakerList({ speakers }) {
  return (
    <ul>
      {speakers.map((speaker) => (
        <li key={speaker.serial}>
          <SpeakerCard speaker={speaker} />
        </li>
      ))}
    </ul>
  )
}
```

`StockList` does the same with records. Once it exists, `App` no longer needs to know what a card looks like. It hands the whole stock to `StockList`, and the list hands each record to a card.

## Keys tell React which item is which

Look at the `key` on the `li` above. When a list changes, React compares the new elements with the old ones to decide what to update. Without keys it can only match them by position: the first with the first, the second with the second.

That goes wrong as soon as items move. Picture a list sorted by price, and a customer resorts it by year. If the keys are positions, React thinks item one is still item one and rewrites its contents, while anything attached to that element, like focus or a half-typed note, stays where it was and now belongs to the wrong record.

A good key belongs to the item itself and never changes: an id from the data. The index from `map` is a position, so it has the same problem as no key at all. React warns in the console when a key is missing, but it cannot warn you about an index key. The check moves the records around and watches whether each one keeps its own list item.

## Showing something only sometimes

The last problem is the Sold mark. JSX has no `if` inside it, but an expression can decide what to render. React renders nothing for `false`, `null` and `undefined`, so this pattern is common:

```jsx
{speaker.refurbished && <span className="tag">Refurbished</span>}
```

When the left side is false, the whole expression is false and nothing appears. When it is true, you get the span. For two different outcomes, use a ternary: `{a ? <One /> : <Two />}`.

## Try it

Keep the Browser panel open while you work; it reloads every time you save. Start with `RecordCard`, then `StockList`, then swap the hand-written list in `App` for `<StockList records={stock} />`. When it works you should see all eight records, and the Sold mark on just two of them. The check uses a stock of its own, so anything typed in by hand will show up.
