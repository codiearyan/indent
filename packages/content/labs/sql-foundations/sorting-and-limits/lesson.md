# Sorting and limits

## What you will be able to do

You can now ask the practice's database for exactly the rows and columns a question needs, gaps and all. There is one thing you have not been able to choose yet: the order the rows come back in. Every result so far came out in whatever order SQLite found the rows, which was fine while Check accepted any order. In this issue the order is the answer. By the end of it you will be able to:

- sort rows by a column, smallest first or largest first
- sort by a second column when the first one ties
- say where empty cells go in a sort, and move them
- keep only the first few rows with `LIMIT`, and know when that is safe

## The request from Winnie

> **Winnie:** The paper cards are in surname order and the screen never is, so I end up scrolling. Ifan wants the dogs from the heaviest down when he doses the worming tablets. Rosamund wants every visit, one vet at a time, newest first. And I write to the owners of our oldest animals about a health check, three letters a week. Can the database tell me who is first in line?

There is also a new dog in the records. Marmite joined this autumn, Nutmeg's brother from the same litter, so the two share a birthday. You will meet him in the last task.

## Putting rows in order

`ORDER BY` sorts the rows. It goes after `FROM` and after any `WHERE`, and takes the column to sort by:

```sql
SELECT name, price
FROM treatments
ORDER BY price;
```

That gives the cheapest treatment first. Numbers sort by size and text sorts from A to Z. Dates here are text written as year, month and day, which is why they sort in date order too: `'2026-02-03'` comes before `'2026-11-18'` letter by letter.

Text sorts by its characters, not by meaning. Capital letters come before small ones in SQLite, so `'Zebra'` sorts before `'apple'`, and a number stored as text sorts letter by letter too, so `'10'` comes before `'9'`. The columns in this repo hold numbers as numbers, so that only bites when you sort something that was typed as text.

`ASC`, short for ascending, after the column asks for smallest first, which is what you get anyway. `DESC`, descending, turns it around:

```sql
SELECT name, price
FROM treatments
ORDER BY price DESC;
```

Write the column name as it is. `ORDER BY 'price'` in single quotes is a piece of text, the same for every row, so it sorts nothing and gives no error.

## Sorting by two columns

When many rows share a value, a second column decides their order among themselves:

```sql
SELECT kind, name, price
FROM treatments
ORDER BY kind, price DESC;
```

The rows are sorted by `kind` first. Only inside each kind does `price` decide, dearest first. Each column has its own direction: the `DESC` belongs to `price` alone, and `kind` still runs from A to Z. A common slip is to expect one `DESC` at the end to turn the whole sort around.

## Where empty cells go

An empty cell has no value to compare, so every database has to pick a place for it. SQLite counts `NULL` as smaller than any value. With the smallest first, the empty cells come at the top. With `DESC`, they sink to the bottom.

```sql
SELECT first_name, email
FROM owners
ORDER BY email;
```

The owners with no email come first here. Not every database agrees: some put empty cells last when sorting smallest first, so always check where they landed. When you want them somewhere else, say so. `NULLS LAST` or `NULLS FIRST` after a column moves them, as in `ORDER BY email NULLS LAST`. Or leave them out with `WHERE email IS NOT NULL`, if the question has no use for them.

## Keeping the first few rows

`LIMIT` keeps only the first rows of the result. It comes last in the query, after `ORDER BY`:

```sql
SELECT name, price
FROM treatments
ORDER BY price DESC
LIMIT 3;
```

That is the three dearest treatments. Put `LIMIT` before `ORDER BY` and SQLite stops with `near "ORDER": syntax error`, because the parts of a query have a fixed order. A `LIMIT` with no `ORDER BY` keeps whichever rows happen to come first, which answers no question at all.

There is a trap in every "top three". Say the third and fourth dearest cost the same. `LIMIT 3` keeps one of them, and nothing says which one. Run it today and you get one; change the data and you may get the other. A top three is only a real answer when the sort has no tie at the cut, or when it says how ties are broken, with a second column:

```sql
ORDER BY price DESC, name
```

Now two treatments with the same price go in order of name, and the result is the same every time.

## Your work in this issue

Four files in `queries/`, one task each, in order. Each task says exactly how the rows must be sorted. Run your query with `node run.mjs` and the file's name, and read the result from the top down: is each row where the task says, empty cells included? Then press Check. This time it compares the order of the rows too, on the data you can see and on hidden data, which has ties and gaps of its own.
