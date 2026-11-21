# Nobody can find a record

## Saturday at the counter

The hold shelf works, and Saturday is busy. Noor sends a note at closing time.

> **Noor:** A man asked whether we had anything by a band with "moth" in the name. I scrolled the whole screen twice. There is a search box at the top and a genre menu, but typing in the box does nothing and the menu only says All genres.

Open `src/Toolbar.jsx`. The input, the select and the Clear button are all there, but nothing connects them to the list. This issue wires them up, and teaches you a habit that keeps screens simple: store the least you can, and work out the rest.

## Two ways to own a text box

A text box on a page keeps its own value. You type, it changes, and nobody else knows. React calls that an uncontrolled input. You can read it when you need it, but the rest of the screen cannot follow it as you type, and the code cannot set it.

A controlled input hands that job to React. Its `value` comes from state, and its `onChange` updates the state.

```jsx
const [note, setNote] = useState('')

<input value={note} onChange={(event) => setNote(event.target.value)} />
```

Now the state is the single source of truth. Every keystroke sets the state, React renders, and the box shows the state. Because the box only ever shows the state, setting the state to an empty string from anywhere, a Clear button for example, empties the box too. A select works the same way: `value` picks the option, `onChange` reports the new pick.

## Lift the value to where it is needed

The search text is typed in the toolbar, but it is the list that has to change. Like the hold shelf, the value belongs in the closest component that holds both, so it lives in `App`. The toolbar gets the value and a function to change it as props, and stays a simple piece that draws controls.

```jsx
<Toolbar query={query} onQueryChange={setQuery} />
```

## Work out the visible list during render

Here is the tempting mistake. You have the stock, and you want the visible records, so you make a second state called `visible` and update it whenever the search changes. Now there are two copies of the truth. When the stock changes, or the genre, or someone releases a record, you have to remember to update `visible` as well.

There is no need. Every time `App` renders, it already has the stock, the search text and the genre. The visible records follow from those three, so work them out right there:

```jsx
const word = filter.trim().toLowerCase()
const shown = tools.filter((tool) => tool.name.toLowerCase().includes(word))
```

This runs on every render, and that is fine; filtering a few hundred items takes no time at all. The list can never be stale, because it is never stored. The same idea gives you the genre options: collect each genre from the stock once, sort them, and draw an option for each. Because they come from the data, a new genre in the racks appears in the menu on its own.

Compare in lower case on both sides so "MOTH" finds "Mothlight", and trim the text so a stray space does not hide everything.

## Two filters at once

With a genre picked and text typed, a record has to pass both tests. Write the filter as two questions joined with "and": is the genre "all" or this record's genre, and does the title or the artist contain the text. Keep the "all" case in mind, or picking All genres will hide everything.

## Say what the screen is showing

When a filter hides most of the stock, people need to know it is a filter and not an empty shop. A line like "Showing 2 of 8 records" says so, and both numbers are already known during render. When nothing matches, replace the list with one plain sentence instead of leaving a blank space. A ternary in JSX picks between the two.

## Try it

Start with the search box: state in `App`, props into `Toolbar`, `value` and `onChange` on the input, and the filter in `App`. Then the genre select and its options, then Clear, then the count line. Search for "moth" in the Browser panel and pick a genre. The check uses a stock with different records and genres, so nothing typed in by hand will pass.
