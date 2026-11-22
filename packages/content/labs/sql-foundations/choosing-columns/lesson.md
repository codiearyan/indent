# Choosing columns

## What you will be able to do

Winnie now has every animal and every owner on her screen, and that turns out to be the next problem: `SELECT *` gives her every column, and most of them are noise when the phone is ringing. In this issue you choose exactly the columns a question needs, give them clear names, and work out new columns from the ones that are stored. By the end of it you will be able to:

- list the columns you want, in the order you want them
- give a column a new name in the result with `AS`
- join pieces of text into one column
- work out a column with arithmetic

## The request from Winnie

> **Winnie:** I only ever need the name and the number when I phone someone. Could the list say "surname" like our paper cards do? And Ifan wants the weights in grams for the small animals room, because that is what the scales there show.

## Naming the columns you want

Instead of `*`, write the names of the columns you want after `SELECT`, with a comma between each two:

```sql
SELECT name, price
FROM treatments;
```

The columns come back in the order you list them, so `SELECT price, name` puts the price first. The rows are the same; only the columns change. A query can run over several lines, and SQLite reads it as one until the semicolon. Putting `FROM` on a line of its own keeps it easy to read.

The names must match `schema.sql` exactly. A misspelt one gives an error you met in the last issue: `no such column: prise`.

Watch the commas. A comma after the last column, as in `SELECT name, price, FROM treatments`, gives `near "FROM": syntax error`: SQLite expected one more column and found `FROM`. A missing comma is sneakier, because it gives no error at all. In `SELECT name price FROM treatments`, SQLite reads `price` as a new name for the `name` column, and you get one column called `price` that is full of treatment names. When a result has fewer columns than you listed, look for a missing comma.

## New names with AS

`AS` gives a column a new name in the result:

```sql
SELECT reason AS why, vet
FROM visits;
```

The column is still called `reason` in the table; only this result calls it `why`. Use names made of letters, digits and underscores, like `visit_reason`, and you never have to think about it again.

## Working out a column

A column in the result does not have to be stored in the table. You can work it out from columns that are. Numbers take `+`, `-`, `*` (times) and `/` (divided by):

```sql
SELECT name, price * 1.2 AS price_with_tax
FROM treatments;
```

Every row gets its own answer, worked out from its own price. Without `AS`, the column would be called `price * 1.2`, which is why a worked-out column almost always gets a name.

One thing about dividing catches people out in SQLite, as in some other databases: when both numbers are whole, the part after the point is dropped, so `7 / 2` gives `3`. Write `7.0 / 2` to get `3.5`.

Text is joined with two bars, `||`:

```sql
SELECT vet || ' saw ' || reason AS line
FROM visits;
```

This gives rows like `Ifan Pryce saw Booster vaccine`. The spaces around `saw` sit inside the quotes, because SQLite joins the pieces exactly as they are and adds nothing. Text you type yourself goes in single quotes. In SQLite as it runs here, double quotes are for names of columns and tables, so `" saw "` gives `no such column: " saw " - should this be a string literal in single-quotes?`. The error even tells you the fix.

Finally, an empty cell spreads. If a column is `NULL` in a row, anything worked out from it is `NULL` too: Willow has no weight, so her weight times anything is still `NULL`. That is right, and the issue about missing values shows what to do about it.

## Your work in this issue

There are four files in `queries/`, one task each, in order. For each, read the comment at the top, write the query below it and run it with `node run.mjs` and the file's name, for example:

```
node run.mjs queries/1-names-and-species.sql
```

Compare the column names on the first line of the output with the task, letter for letter and in order. Then press Check. It compares the columns and their order, and the rows on the data you can see and on hidden data, in any order of rows.
