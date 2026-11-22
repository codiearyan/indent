# Counts and totals

## What you will be able to do

Every query so far gave back rows from a table, one result row for each row that passed. Many questions want something else: not the rows, but one number about them. How many? How much in all? What is the average? In this issue you squeeze a whole table, or the rows that pass a condition, into a single row of figures. By the end of it you will be able to:

- count rows, count filled-in cells, and count different values
- add up, average, and find the smallest and largest value of a column
- round a result to a number of decimal places
- say what each of these does with empty cells, and with no rows at all

## The request from Rosamund

Rosamund Ashdown owns the practice, and the end of the year means forms.

> **Rosamund:** The yearly form wants to know how many owners we have, how many gave us an email and how many towns they come from. I need what the treatments brought in, and the average charge. Ifan wants the average weight of the dogs for his tablet order. And the insurer asks about any single charge over £250. I am fairly sure there were none, but they want a 0, not a blank box.

## Counting

`COUNT` is an aggregate: it reads many rows and gives back one value. Asked on its own, it turns the whole result into one row:

```sql
SELECT COUNT(*) AS visits
FROM visits;
```

`COUNT(*)` counts rows, whatever is in them. Put a column inside the brackets instead and it counts only the rows where that column is filled in, skipping `NULL`:

```sql
SELECT COUNT(*) AS visits, COUNT(notes) AS with_notes
FROM visits;
```

That gives 16 visits, 7 of them with notes. Put `DISTINCT` in front of the column and each different value is counted once, so `COUNT(DISTINCT vet)` is 2: two vets, however many visits each did. Empty cells are not counted there either.

A `WHERE` works as before: it picks the rows first, and the count runs on what is left.

## Adding up

Four more aggregates work on a column of numbers:

- `SUM(price)` adds the values up
- `AVG(price)` gives their average: the sum divided by how many there are
- `MIN(price)` and `MAX(price)` give the smallest and the largest

`MIN` and `MAX` work on text too. On the visit dates, `MIN(visit_date)` is the first visit and `MAX(visit_date)` the latest, because dates written as year, month and day sort in date order. Give each aggregate a name with `AS`, or its column is called `MIN(visit_date)`.

A misspelt function name gives `no such function: AVERAGE`. Brackets with the wrong thing inside give `wrong number of arguments to function SUM()`: only `COUNT` takes a `*`.

An average rarely comes out even. `ROUND` takes a number and how many decimal places to keep: `ROUND(7.0 / 3, 2)` is `2.33`. It goes around the aggregate, as in `ROUND(AVG(column), 1)`.

## Empty cells and aggregates

Every aggregate except `COUNT(*)` skips empty cells. For `SUM`, `MIN` and `MAX` that is what you would expect. For `AVG` it matters more. Say three cats weigh 4 kg, 6 kg and nothing recorded. `AVG` gives 5: it adds the two weights it knows and divides by two. It does not pretend the third cat weighs 0, which would give 3.33.

So the two ways of working out an average are not the same. `SUM(weight_kg) / COUNT(*)` divides by every row, empty ones included, and comes out too low. `AVG` divides by the filled-in cells only. If you ever turn the gaps into zeros first with `COALESCE`, you get the low answer again.

## When nothing matches

A query with an aggregate gives back one row even when no row passes the condition:

```sql
SELECT COUNT(*) AS horses, SUM(weight_kg) AS total_kg
FROM animals
WHERE species = 'horse';
```

The practice has no horses, and the answer is one row: `horses` is `0`, and `total_kg` is `NULL`. A count of nothing is zero. A sum, an average, a smallest or a largest of nothing has no value, so `SUM`, `AVG`, `MIN` and `MAX` give `NULL`. When a form wants a 0 in that box, `COALESCE`, from the issue about missing values, turns the `NULL` into one.

## One row means one row

An aggregate squeezes every row into one, so a plain column next to it has no single value to show. Many databases stop with an error when you write `SELECT name, COUNT(*) FROM animals`. SQLite runs it, and shows the name from one of the rows, which tells you nothing about the count. With `MAX` or `MIN` alone it shows the row that holds the largest or smallest value, a habit of SQLite you should not lean on elsewhere. For now, keep a query with aggregates to aggregates only. The next issue shows how to get one row per group instead.

## Your work in this issue

Four files in `queries/`, one task each, and each returns a single row. Run your query with `node run.mjs` and the file's name, then check the figures against `seed.sql` by hand: count the rows, add up a few prices, and look for the empty cells. Then press Check. It compares the columns and the row on the data you can see and on hidden data, where the counts and totals are different.
