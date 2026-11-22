# Values in curly braces

## What you will be able to do

The welcome screen is built from components now. Its words never change, so they could be typed straight into the JSX. The ride board in the depot is different: what it says changes every day. By the end of this issue you will be able to:

- show a value from your JavaScript inside JSX with curly braces
- work something out inside the braces: a sum, a function call
- give an attribute a value, such as an image's `src`
- set a style from a value, with an object

## The request from Wilf

Wilf keeps the trams running. Every morning he writes the day's plan into `src/today.js`: which tram runs, the first and the last ride, how many rides an hour, and the fare.

> **Wilf:** I write today's plan in that file before we open, and then Elspeth types the same things into the ride board by hand. Yesterday she forgot, and the board said the Kettleby Car all day while the Foundry Belle was out on the track. Can the board just read my file?

Open the Browser panel: the board still shows yesterday. Everything on it was typed into `src/RideBoard.jsx` by hand.

## Curly braces open a window to JavaScript

Inside JSX, text is text. To put a value there instead, wrap a JavaScript expression in curly braces:

```jsx
import { cafe } from './cafe.js'

export function CafeSign() {
  return (
    <div className="cafe">
      <h2>{cafe.name}</h2>
      <p>Open from {cafe.opens} to {cafe.closes}</p>
    </div>
  )
}
```

When React draws `CafeSign`, it works out each expression and puts the result where the braces are. Text and braces mix freely on a line. Change `cafe.js` and the sign follows; nothing about the opening hours is typed in.

Forget the braces and you get the words themselves. `<h2>cafe.name</h2>` shows "cafe.name" on the screen, because without braces JSX has no reason to think it is code.

## Anything that gives a value

The braces take an expression: anything that gives a value. A name, a field, a sum, a function call, a template literal:

```jsx
<p>{cafe.seats - cafe.taken} seats free</p>
<p>Tea {formatPrice(cafe.teaPence)}</p>
<p>{`Table ${cafe.table} is ready`}</p>
```

A function in braces has to be called. `{formatPrice}` hands React the function itself; it cannot show a function, so it shows nothing and warns in the console: `Functions are not valid as a React child`.

Statements do not work inside braces, because they give no value: no `if`, no `for`, no `const`. Work things out above the `return` when it gets long, and use the result inside the JSX.

Some values cannot be shown. Text and numbers appear as you would expect. `true`, `false`, `null` and `undefined` show nothing at all, which a later issue puts to use. A whole object stops the page with `Objects are not valid as a React child`, because React cannot guess which field you meant. And a sum that went wrong shows `NaN` on the screen, usually because one field name was misspelt and gave `undefined`.

## Attributes take values too

An attribute in quotes is a fixed piece of text. An attribute in braces gets a value:

```jsx
<img src={cafe.photo} alt={cafe.name} />
```

`src="cafe.photo"` would ask the browser for a file literally called cafe.photo. Use one or the other: quotes for text that never changes, braces for anything from JavaScript.

## Styles are objects

In HTML, `style` is a line of CSS. In JSX it is a JavaScript object, with CSS names in camelCase: `background-color` becomes `backgroundColor`, `font-size` becomes `fontSize`. The object sits inside the braces, so you see two pairs:

```jsx
<div className="awning" style={{ backgroundColor: cafe.colour }}></div>
```

The outer pair says "a value follows", the inner pair is the object. A style written as a string, `style="color: red"`, stops the page with an error that says the style prop expects a mapping, not a string. A name left with its hyphen works for now but warns: `Unsupported style property`. Most styling still belongs in a CSS class; use `style` for a value that comes from your data, like a colour.

## Your work in this issue

Everything happens in `src/RideBoard.jsx`. It already imports `today` from `src/today.js` and `formatPence` from `src/money.js`. Replace each value typed in by hand with the one from `today`, task by task, and keep the elements and their classes as they are. Save after each change and watch the board in the Browser panel; when it shows today's plan, press Check. The check gives the board days of its own, so anything still typed in will show.
