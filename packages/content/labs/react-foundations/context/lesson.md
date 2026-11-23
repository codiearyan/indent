# A value every part can reach

## What you will be able to do

Props go down one level at a time. That is what makes a component easy to read: everything it needs is in its props. But when a value is needed deep down and by many parts, every component on the way has to take it and pass it on, even the ones that never use it. Context lets a value skip the levels between. By the end of this issue you will be able to:

- make a context with `createContext`, and give it a default
- provide a value to every component below, and read it with `useContext`
- give one part of the screen a different value with a provider inside another
- tell when context helps and when plain props are still better

## The request from Anjali

> **Anjali:** Members of the museum get ten percent off in the shop, and the Member box at the till works. But the discount is handed through every part of that screen, and the shelf and the item don't even use it. Last month somebody added a shelf, forgot to pass it on, and members paid full price for books for a week. Oh, and gift vouchers are never discounted. A ten pound voucher costs ten pounds.

Open `src/Shop.jsx`. `ShopPage` works out the discount and hands it to `Shelf`, which hands it to `ShopItem`, which hands it to `Price`, the only one that uses it. `src/discount.js` is empty.

## Making a context

A context is made once, in a file of its own, so every component that needs it can import it:

```jsx
import { createContext } from 'react'

export const SizeContext = createContext('normal')
```

The value in the brackets is the default: what a component gets when nothing above it provides a value. Choose one that is safe on its own. Leave the brackets empty and the default is `undefined`.

## Providing and reading

A component puts a value in the context for everything below it by drawing the context as a tag with a `value`:

```jsx
function GuideScreen() {
  const [large, setLarge] = useState(false)
  return (
    <SizeContext value={large ? 'large' : 'normal'}>
      <button onClick={() => setLarge(!large)}>Bigger text</button>
      <Gallery />
    </SizeContext>
  )
}
```

Any component inside it, however deep, reads the value with `useContext`:

```jsx
function Caption({ text }) {
  const size = useContext(SizeContext)
  return <p className={`caption ${size}`}>{text}</p>
}
```

`Gallery` and everything between it and `Caption` no longer take a size. When the value changes, React draws again every component that reads it. You may also meet the older way of writing a provider, `<SizeContext.Provider value={...}>`; it does the same.

## What React says, and what it does not

`useContext` is a hook, so it follows the rules from the last issue: at the top of a component, on every draw.

A component with no provider above it gets the default, and React says nothing about it. So a context made but never provided looks like it works: every price is just the default, whatever the Member box says. A provider drawn without `value` is different: every component below gets `undefined`, and the console says ``The `value` prop is required for the `<Context.Provider>`. Did you misspell it or forget to pass it?``.

## A provider inside another

Providers can sit inside each other. A component reads the nearest one above it, so an inner provider changes the value for its part of the screen only:

```jsx
<SizeContext value="large">
  <Gallery />
  <SizeContext value="normal">
    <StaffNotes />
  </SizeContext>
</SizeContext>
```

The gallery is large, and the staff notes stay normal whatever the outer value is.

## When props are still better

Context hides where a value comes from. Reading `Caption`, you no longer see from its props what it depends on, and it only works inside the right provider. So use it for a value many parts need at many depths, like a text size, a language, or a discount. A value one or two levels down, or one that differs for every item, like the item itself or its price, is still a prop. Passing a few props through is not a problem to solve.

## Your work in this issue

Make `DiscountContext` in `src/discount.js`, then read it in `Price`, then provide it from `ShopPage` and take the discount out of the components on the way, and last keep the shelves marked `fullPrice` at full price. The check draws your components under providers of its own, with discounts and shelves of its own, and ticks the Member box itself.
