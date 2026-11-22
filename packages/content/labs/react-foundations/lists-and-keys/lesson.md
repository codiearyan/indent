# Lists and keys

## What you will be able to do

The shed screen draws a card for each tram, but App still names the trams one by one: `trams[0]`, `trams[1]`, `trams[2]`. Add a fourth tram and nobody sees it. Real screens draw lists of any length. By the end of this issue you will be able to:

- turn an array into a list on the screen with `map`
- give each item a key, and say why the key matters
- leave items out with `filter` before drawing
- put items in order without changing the array you were given

## The request from Anjali

Anjali runs the gift shop by the exit. The screen over the till shows what is for sale.

> **Anjali:** I keep the stock list in `shop.js` and add new things at the end. The screen shows three things somebody typed in last month, and one of them is the network map, which sold out weeks ago. Can it show what I have, cheapest first? Parents always ask what costs the least.

Open `src/ShopList.jsx`. It takes an `items` prop, and never looks at it.

## An array of elements is a list

JSX can hold an array, and React draws each element in it, in order. So `map`, which turns each value of an array into a new value, turns data into elements:

```jsx
function StopList({ stops }) {
  return (
    <ol className="stops">
      {stops.map((stop) => (
        <li key={stop.code}>{stop.name}</li>
      ))}
    </ol>
  )
}
```

The callback returns one `<li>` for each stop. Mind the brackets: with round brackets after the arrow, the element is returned. With curly braces, the callback is a block, and it returns nothing unless you write `return`. Forget it and `map` gives back an array of `undefined`, which React draws as nothing: an empty list, and no error.

## Keys tell React which item is which

When a list is drawn again, React compares the new elements with the ones already on the page, and changes only what is different. It needs to know which new element is which old one. That is what `key` is for: a value, on the outermost element of each item, that names the item.

Leave the key out and the console says so: `Each child in a list should have a unique "key" prop.` Two items with the same key bring another warning, `Encountered two children with the same key`. The key goes on the element `map` returns, the `li` above, not on something inside it.

A good key belongs to the item and never changes: an id from the data. The index that `map` passes as its second argument looks tempting, and it silences the warning, but it names a place in the list, not an item. Say the first stop is removed. Every other stop moves up one place, so with index keys React thinks the item at place 0 is still there with new words, and so on down the list. Each element is reused for a different stop, and anything attached to it, such as focus or a half-typed note, ends up on the wrong one. React cannot warn about this, because the keys are unique. The check takes an item out of the list and looks for exactly that.

## Leave out, then draw

To show only some items, filter them first and map what is left. Both are plain array methods, so they chain:

```jsx
const open = stops.filter((stop) => !stop.closed)
return <ol>{open.map((stop) => <li key={stop.code}>{stop.name}</li>)}</ol>
```

Working things out above the `return` keeps the JSX short.

## Props are read-only

Sorting looks just as easy, but `sort` has a catch: it does not make a new array, it reorders the one you call it on. Inside a component, that array is a prop, and it belongs to whoever passed it. A component must leave its props as it got them. React draws a component again whenever it likes, and a component that changes its inputs gives a different answer each time.

Sort a copy instead. `toSorted` returns a new array and leaves the old one alone, and so does `[...stops].sort(...)`. A `filter` already returns a new array, so sorting what it returns is safe. The compare function decides the order: `(a, b) => a.minutes - b.minutes` puts the smallest first.

The check hands your list an array that cannot be changed. If your code tries, the page stops with `Cannot assign to read only property`.

## Your work in this issue

Everything happens in `src/ShopList.jsx`; `App` already passes it the items from `shop.js`. Replace the typed list with one drawn from `items`, then add the key, the filter and the order, one task at a time. Each list item has a span with the class `name` and one with the class `price`. The check draws your list with items of its own, empty lists and sold-out lists included.
