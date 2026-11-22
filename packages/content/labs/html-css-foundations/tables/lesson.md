# A timetable in a table

## What you will be able to do

The home page is finished HTML, and now Kofi has a request for the classes page. This is the first issue of a new part of the repo, about tables and forms: ways to show data in rows and columns, and ways to let visitors send something back. You will be able to:

- tell when content is a table and when it is not
- build a table from rows and cells with `table`, `tr` and `td`
- mark the cells that name a column or a row with `th` and `scope`
- give a table a title with `caption`

## The request from Kofi

> **Kofi:** People keep ringing to ask when the classes are and what they cost. It is all on the classes page, but nobody reads it. I typed the timetable out the way I would write it on the board, with commas. Can the page show it as a proper timetable, so people can read across a row and down a column?

Open `classes.html`. Under the first paragraph, Kofi's timetable is three lines of text and a title. Each line has five pieces, and the commas are the only thing that says where one piece ends. On a phone the lines wrap, and it gets hard to tell which price goes with which class.

## When content is a table

Some content has two directions. Each class has a day, a time, a price and a number of places, and every class has the same kinds of facts. You read across to learn about one class, and down to compare one fact between classes. Content like that is a table.

A list of things in one direction is not a table; it is a list. And a table is never a way to put things side by side on a page because they look nice there. That is a job for CSS, later in this repo. A screen reader treats a table as data: it tells the listener how many rows and columns there are, and lets them move from cell to cell.

## Rows and cells

A table is written row by row. Here are the sessions of a swimming pool:

```html
<table>
  <tr>
    <td>Early swim</td>
    <td>7am</td>
    <td>Lanes only</td>
  </tr>
  <tr>
    <td>Family splash</td>
    <td>2pm</td>
    <td>Floats out</td>
  </tr>
</table>
```

- `table` wraps the whole table.
- `tr`, a table row, holds one row.
- `td`, table data, is one cell. The cells of a row go from left to right.

Every row should have the same number of cells, so each column lines up. If one row has a cell too many, the browser makes the table wider and the columns no longer mean one thing each.

## Header cells

Some cells are not data. They name what the data is. In the pool's table, a top row could say `Session`, `Starts` and `Notes`. Cells like that are header cells, written `th`, and the browser shows them in bold and centred.

A header can name a column or a row. The `scope` attribute says which:

```html
<tr>
  <th scope="col">Session</th>
  <th scope="col">Starts</th>
  <th scope="col">Notes</th>
</tr>
<tr>
  <th scope="row">Early swim</th>
  <td>7am</td>
  <td>Lanes only</td>
</tr>
```

`scope="col"` means "I name the column below me". `scope="row"` means "I name the row I start". With both in place, a screen reader can say "Early swim, Starts, 7am" when the listener reaches that cell, instead of a bare "7am". Only cells that name something are headers. The time and the notes are data, so they stay `td`.

## A title for the table

A table can have a title of its own, written `caption`. It goes right after the opening `table` tag, before the first row:

```html
<table>
  <caption>Pool sessions this week</caption>
  <tr>
    ...
  </tr>
</table>
```

The browser shows it above the table, and a screen reader reads it when the listener reaches the table, so they know what it holds before they start. A paragraph above the table looks the same, but nothing ties it to the table.

You may also see `thead` and `tbody` in tables on the web. They group the header rows and the data rows. The browser adds a `tbody` by itself when you leave it out, so this issue does not need them.

## Your work in this issue

Everything happens in `classes.html`, and the Browser panel shows that page.

1. Turn Kofi's three timetable lines into a table, one row per line and one cell per piece.
2. Make the top row, with the names of the columns, into column headers.
3. Make the name of each class into a header for its row.
4. Turn the `Autumn timetable` line into the table's caption.

Keep Kofi's words exactly as he wrote them; only the commas go. Save after each step, look at the table in the Browser panel, and press Check.
